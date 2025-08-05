const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ShopOwner = require('../models/ShopOwner');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.shopOwnerId = decoded.shopOwnerId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get shop owner profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const shopOwner = await ShopOwner.findById(req.shopOwnerId).select('-password');
    
    if (!shopOwner) {
      return res.status(404).json({ message: 'Shop owner not found' });
    }

    res.json({
      message: 'Profile retrieved successfully',
      shopOwner
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update shop owner profile
router.put('/profile', [
  verifyToken,
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('phone').optional().trim().notEmpty().withMessage('Phone number cannot be empty'),
  body('shopName').optional().trim().notEmpty().withMessage('Shop name cannot be empty'),
  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, shopName, address, password } = req.body;

    // Find shop owner
    let shopOwner = await ShopOwner.findById(req.shopOwnerId);
    if (!shopOwner) {
      return res.status(404).json({ message: 'Shop owner not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== shopOwner.email) {
      const existingShopOwner = await ShopOwner.findOne({ email });
      if (existingShopOwner) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }

    // Update fields
    if (name) shopOwner.name = name;
    if (email) shopOwner.email = email;
    if (phone) shopOwner.phone = phone;
    if (shopName) shopOwner.shopName = shopName;
    if (address) shopOwner.address = address;
    if (password) shopOwner.password = password;

    await shopOwner.save();

    // Create new token if email was changed
    let token;
    if (email && email !== shopOwner.email) {
      token = jwt.sign(
        { shopOwnerId: shopOwner._id },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
    }

    res.json({
      message: 'Profile updated successfully',
      token,
      shopOwner: {
        id: shopOwner._id,
        name: shopOwner.name,
        email: shopOwner.email,
        phone: shopOwner.phone,
        shopName: shopOwner.shopName,
        address: shopOwner.address
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Shop owner registration route
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('shopName').trim().notEmpty().withMessage('Shop name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, shopName, address, password } = req.body;

    // Check if shop owner already exists
    let shopOwner = await ShopOwner.findOne({ email });
    if (shopOwner) {
      return res.status(400).json({ message: 'Shop owner already exists with this email' });
    }

    // Create new shop owner
    shopOwner = new ShopOwner({
      name,
      email,
      phone,
      shopName,
      address,
      password
    });

    await shopOwner.save();

    // Create JWT token
    const token = jwt.sign(
      { shopOwnerId: shopOwner._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Shop owner registered successfully',
      token,
      shopOwner: {
        id: shopOwner._id,
        name: shopOwner.name,
        email: shopOwner.email,
        phone: shopOwner.phone,
        shopName: shopOwner.shopName,
        address: shopOwner.address
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Shop owner login route
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find shop owner by email
    const shopOwner = await ShopOwner.findOne({ email });
    if (!shopOwner) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await shopOwner.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { shopOwnerId: shopOwner._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      shopOwner: {
        id: shopOwner._id,
        name: shopOwner.name,
        email: shopOwner.email,
        phone: shopOwner.phone,
        shopName: shopOwner.shopName,
        address: shopOwner.address
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 