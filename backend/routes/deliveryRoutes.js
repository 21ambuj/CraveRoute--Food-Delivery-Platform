const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

// ALL routes require a valid JWT AND the 'delivery' role
router.use(verifyToken, authorizeRole('delivery'));

// Profile
router.post('/profile', deliveryController.updateProfile);
router.get('/profile', deliveryController.getProfile);

// Orders
router.get('/orders/available', deliveryController.getAvailableOrders);
router.get('/orders/active', deliveryController.getActiveOrder);
router.get('/orders/history', deliveryController.getDeliveryHistory);
router.put('/orders/:orderId/accept', deliveryController.acceptOrder);
router.put('/orders/:orderId/pickup', deliveryController.pickupOrder);
router.put('/orders/:orderId/complete', deliveryController.completeOrder);

// Availability
router.put('/availability', deliveryController.toggleAvailability);

// Live Tracking
router.put('/location', deliveryController.updateLocation);

module.exports = router;
