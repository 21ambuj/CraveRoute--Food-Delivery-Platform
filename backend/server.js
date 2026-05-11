const express = require('express');
const cors = require('cors');
require('dotenv').config();

const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Food & Accessories Delivery API' });
});

// Auth Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Public Data Routes (Browsing)
app.use('/api/restaurants', require('./routes/restaurantRoutes'));
app.use('/api/products', require('./routes/productRoutes'));

// Private Action Routes
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/vendor', require('./routes/vendorRoutes'));
app.use('/api/delivery', require('./routes/deliveryRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));


// Create HTTP Server
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.io
const { init } = require('./utils/socket');
init(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is successfully running on port ${PORT}`);
});
