const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public routes for customers to browse restaurants
router.get('/', restaurantController.getAllRestaurants);
router.get('/:id', restaurantController.getRestaurantById);

// Protected routes
router.post('/:id/rate', verifyToken, restaurantController.rateRestaurant);

module.exports = router;
