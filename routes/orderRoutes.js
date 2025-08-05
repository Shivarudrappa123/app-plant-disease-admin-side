const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');

// Middleware to verify user
const verifyUser = async (req, res, next) => {
  try {
    console.log('Verifying user token...');
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader);
    
    if (!authHeader) {
      console.log('No authorization header found');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Remove 'Bearer ' prefix if it exists
    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Handle userId, id, and shopOwnerId from token
    req.userId = decoded.userId || decoded.id || decoded.shopOwnerId;
    if (!req.userId) {
      console.log('Token missing userId/id/shopOwnerId:', decoded);
      return res.status(401).json({ message: 'Invalid token format' });
    }
    console.log('User verified successfully, userId:', req.userId);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

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

// Create a new order
router.post('/', verifyUser, async (req, res) => {
  try {
    const {
      shopOwner,
      items,
      shippingAddress,
      paymentMethod
    } = req.body;

    // Calculate total amount
    const totalAmount = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const order = new Order({
      user: req.userId,
      shopOwner,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all orders for a user
router.get('/user', verifyUser, async (req, res) => {
  try {
    console.log('Starting to fetch orders for user ID:', req.userId);
    
    // Find all orders for the user
    const orders = await Order.find({ user: req.userId })
      .populate({
        path: 'user',
        select: 'name email phone',
        model: 'User'
      })
      .populate({
        path: 'shopOwner',
        select: 'name shopName',
        model: 'ShopOwner'
      })
      .populate({
        path: 'items.product',
        select: 'name image price',
        model: 'Product'
      })
      .sort({ createdAt: -1 });

    console.log(`Found ${orders.length} orders for user ${req.userId}`);

    if (orders.length === 0) {
      console.log('No orders found for user');
      return res.json([]);
    }

    // Transform the orders to match the expected format
    const transformedOrders = orders.map(order => {
      console.log('Processing order:', order._id);
      return {
        _id: order._id,
        user: {
          name: order.user?.name || 'N/A',
          email: order.user?.email || 'N/A',
          phone: order.user?.phone || 'N/A'
        },
        shippingAddress: order.shippingAddress || 'N/A',
        items: order.items.map(item => ({
          product: {
            name: item.product?.name || 'Product not found',
            price: item.price || 0,
            image: item.product?.image || null
          },
          quantity: item.quantity || 0
        })),
        totalAmount: order.totalAmount || 0,
        status: order.status || 'pending',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        shopOwner: {
          name: order.shopOwner?.name || 'N/A',
          shopName: order.shopOwner?.shopName || 'N/A'
        }
      };
    });

    console.log('Successfully transformed orders');
    res.json(transformedOrders);
  } catch (error) {
    console.error('Error in /user endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch orders',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all orders for a shop owner
router.get('/shop', verifyUser, async (req, res) => {
  try {
    console.log('Starting to fetch orders for shop owner ID:', req.userId);
    
    const orders = await Order.find({ shopOwner: req.userId })
      .populate({
        path: 'user',
        select: 'name email phone',
        model: 'User'
      })
      .populate({
        path: 'shopOwner',
        select: 'name shopName',
        model: 'ShopOwner'
      })
      .populate({
        path: 'items.product',
        select: 'name image price',
        model: 'Product'
      })
      .sort({ createdAt: -1 });

    console.log(`Found ${orders.length} orders for shop owner ${req.userId}`);

    if (orders.length === 0) {
      console.log('No orders found for shop owner');
      return res.json([]);
    }

    const transformedOrders = orders.map(order => ({
      _id: order._id,
      user: {
        name: order.user?.name || 'N/A',
        email: order.user?.email || 'N/A',
        phone: order.user?.phone || 'N/A'
      },
      shippingAddress: order.shippingAddress || 'N/A',
      items: order.items.map(item => ({
        product: {
          name: item.product?.name || 'Product not found',
          price: item.price || 0,
          image: item.product?.image || null
        },
        quantity: item.quantity || 0
      })),
      totalAmount: order.totalAmount || 0,
      status: order.status || 'pending',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      shopOwner: {
        name: order.shopOwner?.name || 'N/A',
        shopName: order.shopOwner?.shopName || 'N/A'
      }
    }));

    console.log('Successfully transformed shop orders');
    res.json(transformedOrders);
  } catch (error) {
    console.error('Error in /shop endpoint:', error);
    res.status(500).json({ 
      message: 'Failed to fetch shop orders',
      error: error.message
    });
  }
});

// Get a single order
router.get('/:id', verifyUser, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('shopOwner', 'name shopName')
      .populate('items.product', 'name image price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the user is authorized to view this order
    if (order.user.toString() !== req.userId && order.shopOwner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all orders for a shop owner/admin
router.get('/shop-owner', verifyUser, async (req, res) => {
  try {
    console.log('Starting to fetch orders for shop owner/admin ID:', req.userId);
    
    // Find all orders for the shop owner/admin
    const orders = await Order.find({ shopOwner: req.userId })
      .populate({
        path: 'user',
        select: 'name email phone',
        model: 'User'
      })
      .populate({
        path: 'shopOwner',
        select: 'name shopName',
        model: 'ShopOwner'
      })
      .populate({
        path: 'items.product',
        select: 'name image price',
        model: 'Product'
      })
      .sort({ createdAt: -1 });

    console.log(`Found ${orders.length} orders for shop owner/admin ${req.userId}`);

    if (orders.length === 0) {
      console.log('No orders found for shop owner/admin');
      return res.json([]);
    }

    // Transform the orders to match the expected format
    const transformedOrders = orders.map(order => {
      console.log('Processing order:', order._id);
      return {
        _id: order._id,
        customer: {
          name: order.user?.name || 'N/A',
          email: order.user?.email || 'N/A',
          phone: order.user?.phone || 'N/A'
        },
        shippingAddress: order.shippingAddress || 'N/A',
        items: order.items.map(item => ({
          product: {
            name: item.product?.name || 'Product not found',
            price: item.price || 0,
            image: item.product?.image || null
          },
          quantity: item.quantity || 0
        })),
        totalAmount: order.totalAmount || 0,
        status: order.status || 'pending',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        shopDetails: {
          name: order.shopOwner?.name || 'N/A',
          shopName: order.shopOwner?.shopName || 'N/A'
        },
        paymentStatus: order.paymentStatus || 'pending',
        paymentMethod: order.paymentMethod || 'N/A'
      };
    });

    console.log('Successfully transformed shop owner/admin orders');
    res.json(transformedOrders);
  } catch (error) {
    console.error('Error in /shop-owner endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch shop owner/admin orders',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update order status (shop owner/admin only)
router.put('/:id/status', verifyUser, async (req, res) => {
  try {
    const { status } = req.body;
    console.log(`Updating order ${req.params.id} status to ${status}`);

    const order = await Order.findById(req.params.id);
    if (!order) {
      console.log('Order not found:', req.params.id);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify that the user is the shop owner of this order
    if (order.shopOwner.toString() !== req.userId) {
      console.log('Unauthorized status update attempt:', req.userId);
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = status;
    await order.save();

    console.log('Order status updated successfully');
    res.json({
      message: 'Order status updated successfully',
      order: {
        _id: order._id,
        status: order.status,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// Update payment status
router.put('/:id/payment', verifyUser, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.json(order);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(400).json({ message: error.message });
  }
});

// Cancel order
router.put('/:id/cancel', verifyUser, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json(order);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 