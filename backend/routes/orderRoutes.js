const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

// @route   POST /api/orders
// @desc    Place a new order (Protected: Only Customers)
router.post('/', verifyToken, authorizeRole('customer'), orderController.placeOrder);

// @route   GET /api/orders/myorders
// @desc    View order history (Protected: Only Customers)
router.get('/myorders', verifyToken, authorizeRole('customer'), orderController.getUserOrders);
router.put('/:orderId/cancel', verifyToken, authorizeRole('customer'), orderController.cancelOrder);

module.exports = router;
