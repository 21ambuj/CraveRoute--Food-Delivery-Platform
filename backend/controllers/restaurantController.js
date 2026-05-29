const db = require('../config/db');

// @desc    Get all active restaurants
// @route   GET /api/restaurants
// @access  Public
exports.getAllRestaurants = async (req, res) => {
    try {
        const { lat, lng, tag, min_rating, fast_delivery, sort_by } = req.query;

        let selectClause = 'SELECT id, name, address, description, latitude, longitude, rating, rating_count, is_active, tags, cost_for_two, image_url';
        let distanceCalc = '';
        let whereClauses = ['is_active = 1'];
        let havingClauses = [];
        let orderByClause = '';
        let params = [];

        if (lat && lng) {
            distanceCalc = `, ( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) AS distance`;
            havingClauses.push(fast_delivery === 'true' ? 'distance <= 3' : 'distance <= 10');
            params.push(lat, lng, lat);
        }

        if (tag) {
            whereClauses.push(`tags LIKE ?`);
            params.push(`%${tag}%`);
        }

        if (min_rating) {
            whereClauses.push(`rating >= ?`);
            params.push(parseFloat(min_rating));
        }

        let query = selectClause + distanceCalc + ' FROM restaurants WHERE ' + whereClauses.join(' AND ');

        if (havingClauses.length > 0) {
            query += ' HAVING ' + havingClauses.join(' AND ');
        }

        if (sort_by === 'cost_low') {
            orderByClause = 'ORDER BY cost_for_two ASC';
        } else if (sort_by === 'rating_high') {
            orderByClause = 'ORDER BY rating DESC';
        } else if (lat && lng) {
            orderByClause = 'ORDER BY distance ASC';
        }

        if (orderByClause) {
            query += ' ' + orderByClause;
        }

        const [restaurants] = await db.query(query, params);
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

        // --- Input Validation ---
        if (!orderId) {
            await connection.rollback();
            return res.status(400).json({ message: "Order ID is required." });
        }
        if (!rating || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
            await connection.rollback();
            return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
        }

        // 0. Prevent duplicate ratings
        const [[existing]] = await connection.query('SELECT id FROM ratings WHERE order_id = ?', [orderId]);
        if (existing) {
            await connection.rollback();
            return res.status(400).json({ message: "You have already rated this order." });
        }

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
