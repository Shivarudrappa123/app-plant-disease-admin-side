const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const shopOwnerRoutes = require('./routes/shopOwnerRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins during development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add detailed logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shop-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Farmer App API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      users: {
        register: '/api/users/register',
        login: '/api/users/login'
      },
      shopOwners: {
        register: '/api/shop-owners/register'
      }
    }
  });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/shop-owners', shopOwnerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.url
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log('Available endpoints:');
  console.log(`- GET  http://${HOST}:${PORT}/`);
  console.log(`- GET  http://${HOST}:${PORT}/test`);
  console.log(`- POST http://${HOST}:${PORT}/api/users/register`);
  console.log(`- POST http://${HOST}:${PORT}/api/users/login`);
  console.log(`- POST http://${HOST}:${PORT}/api/shop-owners/register`);
  console.log(`- POST http://${HOST}:${PORT}/api/products/register`);
  console.log(`- POST http://${HOST}:${PORT}/api/orders/register`);
}); 