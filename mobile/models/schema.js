import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: String,
  price: { type: Number, required: true },
  images: [{
    url: String,
    alt: String
  }],
  category: { type: String, index: true },
  tags: [{ type: String, index: true }],
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for product search and filtering
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, price: 1 });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  status: { type: String, required: true, index: true },
  totalAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for order queries
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true, default: 'user', index: true },
  lastLogin: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for user authentication
userSchema.index({ email: 1, role: 1 });

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now, index: true }
});

// Compound index for cart operations
cartSchema.index({ userId: 1, updatedAt: -1 });

export const Product = mongoose.model('Product', productSchema);
export const Order = mongoose.model('Order', orderSchema);
export const User = mongoose.model('User', userSchema);
export const Cart = mongoose.model('Cart', cartSchema);