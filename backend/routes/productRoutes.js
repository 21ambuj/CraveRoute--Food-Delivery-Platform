const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Public route to browse products (with search/pagination)
router.get('/', productController.getProducts);

module.exports = router;
