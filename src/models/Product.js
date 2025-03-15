const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    url: String,
    alt: String
  }],
  category: {
    type: String,
    required: true,
    enum: ['electronics', 'clothing', 'books', 'home', 'beauty', 'sports', 'other']
  },
  inventory: {
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    warehouseLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    sku: {
      type: String,
      required: true,
      unique: true
    }
  },
  specifications: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock'],
    default: 'active'
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
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
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure SKU is uppercase and follows pattern
productSchema.pre('validate', function(next) {
  if (this.isNew && !this.inventory.sku) {
    this.inventory.sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  this.inventory.sku = this.inventory.sku.toUpperCase();
  next();
});

module.exports = mongoose.model('Product', productSchema);