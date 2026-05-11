const db = require('../config/db');

// @desc    Get all products with filtering, search, and pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
    try {
        // Query Parameters for Filtering and Pagination
        const { restaurant_id, type, search, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Base Query
        let query = 'SELECT * FROM products WHERE is_active = TRUE';
        const queryParams = [];

        // Apply Filters
        if (restaurant_id) {
            query += ' AND restaurant_id = ?';
            queryParams.push(restaurant_id);
        }

        if (type) { // 'food' or 'accessory'
            query += ' AND type = ?';
            queryParams.push(type);
        }

        if (search) {
            query += ' AND name LIKE ?';
            queryParams.push(`%${search}%`);
        }

        // Apply Pagination
        query += ' LIMIT ? OFFSET ?';
        // We push limit and offset as numbers
        queryParams.push(Number(limit), Number(offset));

        const [products] = await db.query(query, queryParams);
        
        res.status(200).json({
            page: Number(page),
            limit: Number(limit),
            results: products.length,
            data: products
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching products" });
    }
};
