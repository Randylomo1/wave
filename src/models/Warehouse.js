const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: [Number]
    }
  },
  capacity: {
    total: {
      type: Number,
      required: true
    },
    available: {
      type: Number,
      default: function() {
        return this.capacity.total;
      }
    },
    unit: {
      type: String,
      default: 'cubic_meters'
    }
  },
  zones: [{
    name: String,
    type: String,
    capacity: Number,
    temperature: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        default: 'celsius'
      }
    }
  }],
  operatingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    open: String,
    close: String
  }],
  features: [{
    name: String,
    value: mongoose.Schema.Types.Mixed
  }],
  staff: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    shift: String
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  maintenanceSchedule: [{
    type: String,
    date: Date,
    description: String,
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed'],
      default: 'scheduled'
    }
  }],
  securityDetails: {
    accessCodes: [String],
    securityCompany: String,
    emergencyContact: {
      name: String,
      phone: String,
      email: String
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
warehouseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for optimization
warehouseSchema.index({ code: 1 });
warehouseSchema.index({ 'address.coordinates': '2dsphere' });
warehouseSchema.index({ status: 1 });

const Warehouse = mongoose.model('Warehouse', warehouseSchema);

module.exports = Warehouse;