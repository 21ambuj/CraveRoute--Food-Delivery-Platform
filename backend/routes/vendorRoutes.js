const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ALL routes in this file require a valid JWT AND the 'vendor' role
router.use(verifyToken, authorizeRole('vendor'));

// @route   POST /api/vendor/upload-image
router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ url });
});

// @route   POST /api/vendor/profile
router.post('/profile', vendorController.createRestaurantProfile);

// @route   GET /api/vendor/profile
router.get('/profile', vendorController.getProfile);

// @route   PUT /api/vendor/profile
router.put('/profile', vendorController.updateProfile);

// @route   POST /api/vendor/products
router.post('/products', vendorController.addProduct);

// @route   PUT /api/vendor/products/:productId
router.put('/products/:productId', vendorController.updateProduct);

// @route   DELETE /api/vendor/products/:productId
router.delete('/products/:productId', vendorController.deleteProduct);

// @route   GET /api/vendor/orders
router.get('/orders', vendorController.getVendorOrders);

// @route   PUT /api/vendor/orders/:orderId/status
router.put('/orders/:orderId/status', vendorController.updateOrderStatus);

// @route   PUT /api/vendor/profile/status
router.put('/profile/status', vendorController.toggleStatus);

// @route   GET /api/vendor/ratings
router.get('/ratings', vendorController.getVendorRatings);

module.exports = router;
