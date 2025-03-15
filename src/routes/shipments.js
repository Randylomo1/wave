const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authorize } = require('./auth');

// Create shipment for order
router.post('/:orderId', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Order already has a shipment' });
        }

        // Add shipment creation to queue for async processing
        await req.app.get('shipmentQueue').add('createShipment', {
            orderId: order._id,
            shipmentData: req.body,
            userId: req.user._id
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        });

        order.status = 'processing';
        await order.save();

        res.status(202).json({
            message: 'Shipment creation in progress',
            orderId: order._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating shipment', error: error.message });
    }
});

// Update shipment status and location
router.patch('/:orderId/status', authorize(['admin', 'manager', 'driver']), async (req, res) => {
    try {
        const { status, currentLocation, notes } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order || !order.shipment) {
            return res.status(404).json({ message: 'Shipment not found' });
        }

        order.shipment.status = status;
        if (currentLocation) {
            order.shipment.currentLocation = currentLocation;
        }
        if (notes) {
            order.shipment.statusHistory.push({
                status,
                location: currentLocation,
                notes,
                timestamp: new Date(),
                updatedBy: req.user._id
            });
        }

        if (status === 'delivered') {
            order.status = 'completed';
            order.delivery.actualDate = new Date();
        }

        await order.save();

        // Emit socket event for real-time updates
        req.app.get('io').emit('shipmentUpdated', {
            orderId: order._id,
            status,
            currentLocation,
            timestamp: new Date()
        });

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error updating shipment', error: error.message });
    }
});

// Get shipment tracking details
router.get('/:orderId/tracking', authorize(), async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('customer', 'firstName lastName email')
            .select('orderNumber shipment status pickup delivery');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user has permission to view this shipment
        if (req.user.role === 'customer' && order.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access forbidden' });
        }

        res.json({
            orderNumber: order.orderNumber,
            status: order.status,
            shipment: order.shipment,
            pickup: order.pickup,
            delivery: order.delivery
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tracking details', error: error.message });
    }
});

// Helper function for route optimization
async function optimizeRoute(pickup, delivery) {
    // Here you would integrate with a route optimization service
    // For now, returning a simple route structure
    return {
        distance: 0, // Calculate actual distance
        duration: 0, // Calculate estimated duration
        waypoints: [
            { ...pickup, type: 'pickup' },
            { ...delivery, type: 'delivery' }
        ],
        optimizedPath: [] // Add actual coordinates for the optimized route
    };
}

module.exports = router;