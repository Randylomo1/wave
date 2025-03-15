const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { authorize } = require('./auth');
const { apiLimiter } = require('../middleware/security');

// Get user's cart
router.get('/', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id, status: 'active' })
      .populate('items.product');

    if (!cart) {
      cart = new Cart({ user: req.user._id });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
});

// Add item to cart with inventory validation
router.post('/items', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({
        message: 'Invalid request',
        details: 'Product ID and positive quantity are required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        message: 'Product not found',
        details: 'The requested product does not exist'
      });
    }

    if (product.inventory.quantity < quantity) {
      return res.status(400).json({
        message: 'Insufficient inventory',
        details: `Only ${product.inventory.quantity} units available`
      });
    }

    let cart = await Cart.findOne({ user: req.user._id, status: 'active' });
    if (!cart) {
      cart = new Cart({ user: req.user._id });
    }

    const existingItem = cart.items.find(item => item.product.equals(productId));
    if (existingItem && existingItem.quantity + quantity > product.inventory.quantity) {
      return res.status(400).json({
        message: 'Insufficient inventory',
        details: `Cannot add ${quantity} more units. Total would exceed available stock.`
      });
    }

    await cart.addItem(productId, quantity);
    await cart.populate('items.product');

    res.json({
      success: true,
      cart,
      message: 'Item added to cart successfully'
    });
  } catch (error) {
    console.error('Cart addition error:', error);
    res.status(500).json({
      message: 'Error adding item to cart',
      details: error.message
    });
  }
});

// Update cart item quantity
router.put('/items/:productId', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id, status: 'active' });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.find(item => item.product.equals(req.params.productId));
    if (!item) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(item => !item.product.equals(req.params.productId));
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.product');

    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove item from cart
router.delete('/items/:productId', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, status: 'active' });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => !item.product.equals(req.params.productId));
    await cart.save();

    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Checkout cart
router.post('/checkout', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    const cart = await Cart.findOne({ user: req.user._id, status: 'active' })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Create order from cart
    const orderItems = cart.items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      weight: item.product.specifications.weight,
      dimensions: item.product.specifications.dimensions
    }));

    const order = new Order({
      customer: req.user._id,
      items: orderItems,
      delivery: {
        address: shippingAddress,
        contactName: req.user.firstName + ' ' + req.user.lastName,
        contactPhone: req.user.phone
      },
      status: 'pending'
    });

    await order.save();

    // Update cart status
    cart.status = 'checkout';
    await cart.save();

    res.json({ order, message: 'Order created successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;