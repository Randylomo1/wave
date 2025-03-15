const express = require('express');
const router = express.Router();
const { authorize } = require('./auth');
const { apiLimiter } = require('../middleware/security');
const PaymentService = require('../services/payment');

// Initialize PayPal payment
router.post('/paypal/create', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const order = await PaymentService.createPayPalOrder(amount, currency);
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'PayPal payment initialization failed', error: error.message });
  }
});

// Capture PayPal payment
router.post('/paypal/capture/:orderId', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await PaymentService.capturePayPalPayment(orderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'PayPal payment capture failed', error: error.message });
  }
});

// Process card payment
router.post('/card', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    const { cardToken, amount, currency } = req.body;
    const result = await PaymentService.processCardPayment(cardToken, amount, currency);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Card payment processing failed', error: error.message });
  }
});

// Initiate M-Pesa payment
router.post('/mpesa/initiate', authorize(['customer']), apiLimiter, async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference } = req.body;
    const result = await PaymentService.initiateMpesaPayment(phoneNumber, amount, accountReference);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'M-Pesa payment initiation failed', error: error.message });
  }
});

// M-Pesa callback URL
router.post('/mpesa/callback', async (req, res) => {
  try {
    // Process M-Pesa callback data
    const { Body } = req.body;
    
    // Update order status based on callback data
    if (Body.stkCallback.ResultCode === 0) {
      // Payment successful
      // Update order status in database
    } else {
      // Payment failed
      // Handle failure
    }

    res.json({ success: true });
  } catch (error) {
    console.error('M-Pesa callback processing failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;