const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware to verify shop owner
const verifyShopOwner = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.shopOwnerId = decoded.shopOwnerId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create a new product
router.post('/', verifyShopOwner, upload.single('image'), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { name, price, description, stock, category } = req.body;
    
    if (!name || !price || !description || !stock || !category) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const product = new Product({
      name,
      price: parseFloat(price),
      description,
      stock: parseInt(stock),
      category,
      image: req.file ? req.file.path : null,
      shopOwner: req.shopOwnerId
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all products with pagination, filtering, and sorting
router.get('/', async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.minPrice) {
      filter.price = { ...filter.price, $gte: parseFloat(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      filter.price = { ...filter.price, $lte: parseFloat(req.query.maxPrice) };
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Sorting
    const sortOptions = {};
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      sortOptions[req.query.sortBy] = sortOrder;
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('shopOwner', 'name shopName')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter)
    ]);

    res.json({
      products,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all products (public access)
router.get('/all', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('shopOwner', 'name shopName')
      .select('name price description image category stock')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Get products by shop owner
router.get('/shop/:shopOwnerId', async (req, res) => {
  try {
    const products = await Product.find({ shopOwner: req.params.shopOwnerId })
      .populate('shopOwner', 'name shopName');
    res.json(products);
  } catch (error) {
    console.error('Error fetching shop products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('shopOwner', 'name shopName');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update a product
router.put('/:id', verifyShopOwner, upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, stock, category } = req.body;
    const updateData = {
      name,
      price: parseFloat(price),
      description,
      stock: parseInt(stock),
      category
    };

    if (req.file) {
      // Delete old image if exists
      const product = await Product.findById(req.params.id);
      if (product.image && fs.existsSync(product.image)) {
        fs.unlinkSync(product.image);
      }
      updateData.image = req.file.path;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a product
router.delete('/:id', verifyShopOwner, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete product image if exists
    if (product.image && fs.existsSync(product.image)) {
      fs.unlinkSync(product.image);
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 