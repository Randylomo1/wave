const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authorize } = require('./auth');

// Create new order
router.post('/', authorize(['customer', 'admin']), async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            customer: req.user._id,
            orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            status: 'pending'
        };

        const order = new Order(orderData);
        await order.save();

        // Add to processing queue
        await req.app.get('orderQueue').add('processOrder', {
            orderId: order._id,
            data: orderData
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        });

        // Emit socket event for real-time updates
        req.app.get('io').emit('orderCreated', order);

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error creating order', error: error.message });
    }
});

// Get all orders (with filters)
router.get('/', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(query)
            .populate('customer', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
});

// Get customer's orders
router.get('/my-orders', authorize(['customer']), async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user._id })
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
});

// Get order by ID
router.get('/:id', authorize(), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'firstName lastName email');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user has permission to view this order
        if (req.user.role === 'customer' && order.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access forbidden' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order', error: error.message });
    }
});

// Update order status
router.patch('/:id/status', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Emit socket event for real-time updates
        req.app.get('io').emit('orderStatusUpdated', order);

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error updating order status', error: error.message });
    }
});

// Cancel order
router.delete('/:id', authorize(['customer', 'admin']), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user has permission to cancel this order
        if (req.user.role === 'customer' && order.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access forbidden' });
        }

        // Only allow cancellation of pending orders
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot cancel order in current status' });
        }

        order.status = 'cancelled';
        await order.save();

        // Emit socket event for real-time updates
        req.app.get('io').emit('orderCancelled', order);

        res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling order', error: error.message });
    }
});

module.exports = router;