const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

// ALL routes require a valid JWT AND the 'admin' role
router.use(verifyToken, authorizeRole('admin'));

// Analytics
router.get('/stats', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Vendor Control
router.put('/restaurants/:id/status', adminController.toggleRestaurantStatus);

module.exports = router;
