const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { verifyToken } = require('../middlewares/authMiddleware');

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Login user and return JWT
router.post('/login', authController.login);

// @route   GET /api/auth/profile
// @desc    Fetch current user data
router.get('/profile', verifyToken, authController.getProfile);

module.exports = router;
