const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const path = require('path');
const app = express();

// 1. Security Middleware — Helmet sets secure HTTP headers
app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS — Restrict to known frontend origins only
app.use(cors({
    origin: function (origin, callback) {
        const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : null;
        const allowedOrigins = [
            'http://localhost:5173', 
            'http://127.0.0.1:5173', 
            frontendUrl
        ].filter(Boolean);

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Rate Limiting — General API protection (Limits increased for presentation/demo)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Increased from 200 to 2000 for presentation safety
    message: { message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(generalLimiter);

// 4. Strict Auth Rate Limiter — Prevent brute-force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Increased from 20 to 100 for presentation safety
    message: { message: 'Too many login/register attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 5. Body Parser
app.use(express.json({ limit: '10mb' })); // Parses incoming JSON requests
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
