const db = require('../config/db');

// @desc    Get all active restaurants
// @route   GET /api/restaurants
// @access  Public
exports.getAllRestaurants = async (req, res) => {
    try {
        const [restaurants] = await db.query(
            'SELECT id, name, address, description, latitude, longitude, rating, rating_count, is_active FROM restaurants'
        );
        res.status(200).json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching restaurants" });
    }
};

// @desc    Get a single restaurant by ID
// @route   GET /api/restaurants/:id
// @access  Public
exports.getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params;
        const [restaurants] = await db.query(
            'SELECT id, name, address, description, latitude, longitude, rating, rating_count, is_active FROM restaurants WHERE id = ?', 
            [id]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        res.status(200).json(restaurants[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching restaurant details" });
    }
};

// @desc    Rate a restaurant
// @route   POST /api/restaurants/:id/rate
// @access  Private (Customer only)
exports.rateRestaurant = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { rating, comment, orderId } = req.body;
        const user_id = req.user.id;

        // 1. Insert into ratings table
        await connection.query(
            'INSERT INTO ratings (user_id, restaurant_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [user_id, id, orderId, rating, comment]
        );

        // 2. Update restaurant average rating
        const [[stats]] = await connection.query(
            'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM ratings WHERE restaurant_id = ?',
            [id]
        );

        await connection.query(
            'UPDATE restaurants SET rating = ?, rating_count = ? WHERE id = ?',
            [stats.avg_rating, stats.count, id]
        );

        await connection.commit();
        res.status(200).json({ message: "Rating submitted successfully!" });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: "Failed to submit rating" });
    } finally {
        connection.release();
    }
};
