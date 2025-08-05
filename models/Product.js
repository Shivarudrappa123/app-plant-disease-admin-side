const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true
  },
  stock: {
    type: Number,
    required: [true, 'Product stock is required'],
    min: [0, 'Stock cannot be negative']
  },
  image: {
    type: String,
    required: [true, 'Product image is required']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true
  },
  shopOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopOwner',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema); 