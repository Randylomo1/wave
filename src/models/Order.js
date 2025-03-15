const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  payment: {
    method: {
      type: String,
      enum: ['paypal', 'card', 'mpesa'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    transactionId: String,
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    paymentDate: Date
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    name: String,
    quantity: Number,
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  }],
  pickup: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    contactName: String,
    contactPhone: String,
    scheduledDate: Date
  },
  delivery: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    contactName: String,
    contactPhone: String,
    expectedDate: Date,
    actualDate: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    unique: true
  },
  carrier: {
    name: String,
    trackingUrl: String
  },
  route: {
    optimizedPath: [{
      location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
      },
      arrivalTime: Date,
      departureTime: Date
    }],
    currentLocation: {
      type: { type: String, default: 'Point' },
      coordinates: [Number]
    }
  },
  pricing: {
    basePrice: Number,
    taxes: Number,
    additionalCharges: [{
      description: String,
      amount: Number
    }],
    totalPrice: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for optimization
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'route.currentLocation': '2dsphere' });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;