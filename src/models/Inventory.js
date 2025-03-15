const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      unique: true
    },
    description: String,
    category: String,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        default: 'cm'
      }
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        default: 'kg'
      }
    }
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  location: {
    zone: String,
    aisle: String,
    rack: String,
    shelf: String,
    bin: String
  },
  quantity: {
    inStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reserved: {
      type: Number,
      default: 0
    },
    available: {
      type: Number,
      default: 0
    },
    reorderPoint: Number,
    maximumStock: Number
  },
  supplier: {
    name: String,
    code: String,
    leadTime: Number
  },
  status: {
    type: String,
    enum: ['active', 'discontinued', 'out_of_stock'],
    default: 'active'
  },
  movementHistory: [{
    type: {
      type: String,
      enum: ['received', 'shipped', 'adjusted', 'transferred'],
      required: true
    },
    quantity: Number,
    reference: String,
    fromLocation: String,
    toLocation: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Update lastUpdated timestamp before saving
inventorySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  // Calculate available quantity
  this.quantity.available = this.quantity.inStock - this.quantity.reserved;
  next();
});

// Indexes for optimization
inventorySchema.index({ 'product.sku': 1 });
inventorySchema.index({ warehouse: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ 'product.name': 'text' });

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;