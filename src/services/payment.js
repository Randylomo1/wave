const axios = require('axios');
const crypto = require('crypto');

// PayPal SDK
const paypal = require('@paypal/checkout-server-sdk');
const environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// M-Pesa API Configuration
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_API_URL = 'https://sandbox.safaricom.co.ke';

class PaymentService {
  // PayPal Payment
  async createPayPalOrder(amount, currency = 'USD') {
    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString()
          }
        }]
      });

      const order = await paypalClient.execute(request);
      return {
        orderId: order.result.id,
        approvalUrl: order.result.links.find(link => link.rel === 'approve').href
      };
    } catch (error) {
      throw new Error(`PayPal order creation failed: ${error.message}`);
    }
  }

  async capturePayPalPayment(orderId) {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      const capture = await paypalClient.execute(request);
      return {
        success: true,
        transactionId: capture.result.purchase_units[0].payments.captures[0].id
      };
    } catch (error) {
      throw new Error(`PayPal payment capture failed: ${error.message}`);
    }
  }

  // Card Payment (Using Stripe as an example)
  async processCardPayment(cardToken, amount, currency = 'USD') {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        payment_method: cardToken,
        confirmation_method: 'manual',
        confirm: true
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error) {
      throw new Error(`Card payment processing failed: ${error.message}`);
    }
  }

  // M-Pesa Payment
  async generateMpesaAccessToken() {
    try {
      const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
      const response = await axios.get(`${MPESA_API_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      return response.data.access_token;
    } catch (error) {
      throw new Error(`M-Pesa access token generation failed: ${error.message}`);
    }
  }

  async initiateMpesaPayment(phoneNumber, amount, accountReference) {
    try {
      const accessToken = await this.generateMpesaAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

      const response = await axios.post(
        `${MPESA_API_URL}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: MPESA_SHORTCODE,
          PhoneNumber: phoneNumber,
          CallBackURL: `${process.env.BASE_URL}/api/payments/mpesa/callback`,
          AccountReference: accountReference,
          TransactionDesc: 'Wave Logistics Payment'
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID
      };
    } catch (error) {
      throw new Error(`M-Pesa payment initiation failed: ${error.message}`);
    }
  }
}

module.exports = new PaymentService();