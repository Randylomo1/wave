const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const { authorize } = require('./auth');

// Get inventory items (with filters)
router.get('/', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const { warehouse, category, lowStock, page = 1, limit = 10 } = req.query;
        const query = {};

        if (warehouse) query['warehouse'] = warehouse;
        if (category) query['product.category'] = category;
        if (lowStock === 'true') {
            query['quantity.inStock'] = { $lte: query['quantity.threshold'] };
        }

        const items = await Inventory.find(query)
            .populate('warehouse', 'name code')
            .sort({ 'product.name': 1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Inventory.countDocuments(query);

        res.json({
            items,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching inventory', error: error.message });
    }
});

// Add new inventory item
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const inventory = new Inventory(req.body);
        await inventory.save();

        // Check if stock level is below threshold
        if (inventory.quantity.inStock <= inventory.quantity.threshold) {
            req.app.get('io').emit('lowStockAlert', {
                item: inventory.product.name,
                warehouse: inventory.warehouse,
                currentStock: inventory.quantity.inStock,
                threshold: inventory.quantity.threshold
            });
        }

        res.status(201).json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Error adding inventory item', error: error.message });
    }
});

// Update inventory quantity
router.patch('/:id/quantity', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const { adjustment, reason } = req.body;
        const inventory = await Inventory.findById(req.params.id);

        if (!inventory) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        const newQuantity = inventory.quantity.inStock + adjustment;
        if (newQuantity < 0) {
            return res.status(400).json({ message: 'Insufficient stock for adjustment' });
        }

        inventory.quantity.inStock = newQuantity;
        inventory.quantity.history.push({
            adjustment,
            reason,
            timestamp: new Date(),
            updatedBy: req.user._id
        });

        await inventory.save();

        // Check if stock level is below threshold
        if (newQuantity <= inventory.quantity.threshold) {
            req.app.get('io').emit('lowStockAlert', {
                item: inventory.product.name,
                warehouse: inventory.warehouse,
                currentStock: newQuantity,
                threshold: inventory.quantity.threshold
            });
        }

        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Error updating inventory quantity', error: error.message });
    }
});

// Get warehouse inventory summary
router.get('/warehouse/:warehouseId', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId);
        if (!warehouse) {
            return res.status(404).json({ message: 'Warehouse not found' });
        }

        const inventory = await Inventory.find({ warehouse: req.params.warehouseId })
            .select('product.name product.category quantity.inStock quantity.threshold');

        const summary = {
            warehouse: warehouse.name,
            totalItems: inventory.length,
            lowStockItems: inventory.filter(item => item.quantity.inStock <= item.quantity.threshold).length,
            categoryBreakdown: inventory.reduce((acc, item) => {
                const category = item.product.category;
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {})
        };

        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching warehouse summary', error: error.message });
    }
});

// Transfer inventory between warehouses
router.post('/transfer', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const { sourceWarehouseId, destinationWarehouseId, items } = req.body;

        // Validate warehouses
        const [sourceWarehouse, destWarehouse] = await Promise.all([
            Warehouse.findById(sourceWarehouseId),
            Warehouse.findById(destinationWarehouseId)
        ]);

        if (!sourceWarehouse || !destWarehouse) {
            return res.status(404).json({ message: 'Warehouse not found' });
        }

        // Process each item transfer
        const transferResults = await Promise.all(items.map(async (item) => {
            const sourceInventory = await Inventory.findOne({
                warehouse: sourceWarehouseId,
                'product.sku': item.sku
            });

            if (!sourceInventory || sourceInventory.quantity.inStock < item.quantity) {
                return {
                    sku: item.sku,
                    success: false,
                    message: 'Insufficient stock'
                };
            }

            // Update source inventory
            sourceInventory.quantity.inStock -= item.quantity;
            sourceInventory.quantity.history.push({
                adjustment: -item.quantity,
                reason: `Transfer to ${destWarehouse.name}`,
                timestamp: new Date(),
                updatedBy: req.user._id
            });

            // Update or create destination inventory
            let destInventory = await Inventory.findOne({
                warehouse: destinationWarehouseId,
                'product.sku': item.sku
            });

            if (destInventory) {
                destInventory.quantity.inStock += item.quantity;
                destInventory.quantity.history.push({
                    adjustment: item.quantity,
                    reason: `Transfer from ${sourceWarehouse.name}`,
                    timestamp: new Date(),
                    updatedBy: req.user._id
                });
            } else {
                destInventory = new Inventory({
                    ...sourceInventory.toObject(),
                    _id: undefined,
                    warehouse: destinationWarehouseId,
                    quantity: {
                        inStock: item.quantity,
                        threshold: sourceInventory.quantity.threshold,
                        history: [{
                            adjustment: item.quantity,
                            reason: `Transfer from ${sourceWarehouse.name}`,
                            timestamp: new Date(),
                            updatedBy: req.user._id
                        }]
                    }
                });
            }

            await Promise.all([
                sourceInventory.save(),
                destInventory.save()
            ]);

            return {
                sku: item.sku,
                success: true,
                sourceQuantity: sourceInventory.quantity.inStock,
                destinationQuantity: destInventory.quantity.inStock
            };
        }));

        res.json({
            message: 'Transfer completed',
            results: transferResults
        });
    } catch (error) {
        res.status(500).json({ message: 'Error processing transfer', error: error.message });
    }
});

module.exports = router;