const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  status: {
    type: String,
    enum: ['active', 'checkout', 'abandoned'],
    default: 'active'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Update subtotal when items change
cartSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  this.lastActivity = Date.now();
  next();
});

// Method to add item to cart
cartSchema.methods.addItem = async function(productId, quantity) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  
  if (!product) throw new Error('Product not found');
  if (product.inventory.quantity < quantity) throw new Error('Insufficient inventory');

  const existingItem = this.items.find(item => item.product.equals(productId));
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = product.price;
  } else {
    this.items.push({
      product: productId,
      quantity,
      price: product.price
    });
  }

  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);