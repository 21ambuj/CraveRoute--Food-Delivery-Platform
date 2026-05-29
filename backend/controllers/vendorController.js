const db = require('../config/db');

// Allowed order status transitions for vendor
const ALLOWED_STATUSES = ['preparing', 'out_for_delivery', 'delivered', 'cancelled'];

// Helper function to get the vendor's restaurant ID securely
const getRestaurantId = async (userId) => {
    const [[restaurant]] = await db.query('SELECT id FROM restaurants WHERE user_id = ?', [userId]);
    return restaurant ? restaurant.id : null;
};

// @desc    Create Restaurant Profile
// @route   POST /api/vendor/profile
// @access  Private (Vendor only)
exports.createRestaurantProfile = async (req, res) => {
    try {
        const { name, address, description, image_url, latitude, longitude, cost_for_two } = req.body;

        // --- Validation ---
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Restaurant name is required." });
        }
        if (!address || !address.trim()) {
            return res.status(400).json({ message: "Restaurant address is required." });
        }
        
        // Prevent creating multiple restaurants for one vendor
        const existingId = await getRestaurantId(req.user.id);
        if (existingId) return res.status(400).json({ message: "Profile already exists." });

        const [result] = await db.query(
            'INSERT INTO restaurants (user_id, name, address, description, image_url, latitude, longitude, cost_for_two) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, name.trim(), address.trim(), description || '', image_url || '', latitude || null, longitude || null, cost_for_two || 300]
        );
        res.status(201).json({ message: "Restaurant profile created!", restaurantId: result.insertId });
    } catch (error) {
        console.error('Create profile error:', error.message);
        res.status(500).json({ message: "Failed to create profile" });
    }
};

// @desc    Get all ratings for the vendor's restaurant
// @route   GET /api/vendor/ratings
// @access  Private (Vendor only)
exports.getVendorRatings = async (req, res) => {
    try {
        const restaurant_id = await getRestaurantId(req.user.id);
        if (!restaurant_id) return res.status(403).json({ message: "Access denied." });

        const [ratings] = await db.query(`
            SELECT r.*, u.name as user_name
            FROM ratings r
            JOIN users u ON r.user_id = u.id
            WHERE r.restaurant_id = ?
            ORDER BY r.created_at DESC
        `, [restaurant_id]);
        res.status(200).json(ratings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch ratings" });
    }
};

// @desc    Get Vendor's Restaurant Profile
// @route   GET /api/vendor/profile
// @access  Private (Vendor only)
exports.getProfile = async (req, res) => {
    try {
        const [restaurant] = await db.query('SELECT * FROM restaurants WHERE user_id = ?', [req.user.id]);
        res.status(200).json(restaurant[0] || null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};

// @desc    Add a new product (Food or Accessory)
// @route   POST /api/vendor/products
// @access  Private (Vendor only)
exports.addProduct = async (req, res) => {
    try {
        const { name, description, price, type, image_url } = req.body;
        const restaurant_id = await getRestaurantId(req.user.id);

        if (!restaurant_id) {
            return res.status(403).json({ message: "You must create a restaurant profile first." });
        }

        // --- Validation ---
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Product name is required." });
        }
        if (!price || isNaN(price) || Number(price) <= 0) {
            return res.status(400).json({ message: "Price must be a positive number." });
        }
        if (type && !['food', 'accessory'].includes(type)) {
            return res.status(400).json({ message: "Type must be 'food' or 'accessory'." });
        }

        const [result] = await db.query(
            'INSERT INTO products (restaurant_id, name, description, price, type, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [restaurant_id, name.trim(), description || '', Number(price), type || 'food', image_url || '']
        );

        res.status(201).json({ message: "Product added successfully", productId: result.insertId });
    } catch (error) {
        console.error('Add product error:', error.message);
        res.status(500).json({ message: "Failed to add product" });
    }
};

// @desc    Update an existing product
// @route   PUT /api/vendor/products/:productId
// @access  Private (Vendor only)
exports.updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, description, price, type, image_url } = req.body;
        const restaurant_id = await getRestaurantId(req.user.id);

        if (!restaurant_id) return res.status(403).json({ message: "Access denied." });

        // Security check: Ensure product belongs to this vendor's restaurant
        const [[product]] = await db.query('SELECT id FROM products WHERE id = ? AND restaurant_id = ?', [productId, restaurant_id]);
        if (!product) return res.status(404).json({ message: "Product not found or unauthorized." });

        await db.query(
            'UPDATE products SET name = ?, description = ?, price = ?, type = ?, image_url = ? WHERE id = ?',
            [name, description, price, type, image_url, productId]
        );

        res.status(200).json({ message: "Product updated successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update product" });
    }
};

// @desc    Delete a product
// @route   DELETE /api/vendor/products/:productId
// @access  Private (Vendor only)
exports.deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const restaurant_id = await getRestaurantId(req.user.id);

        if (!restaurant_id) return res.status(403).json({ message: "Access denied." });

        // Security check
        const [[product]] = await db.query('SELECT id FROM products WHERE id = ? AND restaurant_id = ?', [productId, restaurant_id]);
        if (!product) return res.status(404).json({ message: "Product not found or unauthorized." });

        await db.query('DELETE FROM products WHERE id = ?', [productId]);
        res.status(200).json({ message: "Product deleted successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete product" });
    }
};

// @desc    Get all orders for the vendor
// @route   GET /api/vendor/orders
// @access  Private (Vendor only)
exports.getVendorOrders = async (req, res) => {
    try {
        const restaurant_id = await getRestaurantId(req.user.id);
        if (!restaurant_id) return res.status(403).json({ message: "Access denied." });

        const [orders] = await db.query(`
            SELECT o.*, 
                   u.name as customer_name, u.latitude as customer_lat, u.longitude as customer_lng,
                   d.name as delivery_boy_name, d.latitude as delivery_boy_lat, d.longitude as delivery_boy_lng
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN users d ON o.delivery_boy_id = d.id
            WHERE o.restaurant_id = ? 
            ORDER BY o.created_at DESC
        `, [restaurant_id]);
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// @desc    Update order status
// @route   PUT /api/vendor/orders/:orderId/status
// @access  Private (Vendor only)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const restaurant_id = await getRestaurantId(req.user.id);

        if (!restaurant_id) return res.status(403).json({ message: "Access denied." });

        // --- Status Whitelist Validation (Security Fix) ---
        if (!status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
        }

        // Security check: Make sure this order belongs to this specific vendor
        const [[order]] = await db.query('SELECT id FROM orders WHERE id = ? AND restaurant_id = ?', [orderId, restaurant_id]);
        
        if (!order) {
            return res.status(404).json({ message: "Order not found or unauthorized." });
        }

        if (status === 'cancelled') {
            await db.query("UPDATE orders SET status = 'cancelled', total_amount = 0 WHERE id = ?", [orderId]);
        } else {
            await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        }

        // Notify customer via socket
        try {
            const { getIO } = require('../utils/socket');
            const io = getIO();
            const [[orderInfo]] = await db.query('SELECT user_id FROM orders WHERE id = ?', [orderId]);
            if (orderInfo) {
                io.to(`user_${orderInfo.user_id}`).emit('order_update', {
                    orderId,
                    status,
                    message: `Your order status has been updated to: ${status}`
                });
                io.to(`order_${orderId}`).emit('status_change', { status });
            }
        } catch (socketErr) {
            console.error('Socket notification failed:', socketErr.message);
        }

        res.status(200).json({ message: `Order status updated to ${status}` });
    } catch (error) {
        console.error('Update order status error:', error.message);
        res.status(500).json({ message: "Failed to update order status" });
    }
};

// @desc    Toggle Restaurant Availability (Open/Closed)
// @route   PUT /api/vendor/profile/status
// @access  Private (Vendor only)
exports.toggleStatus = async (req, res) => {
    try {
        const { is_active } = req.body;
        const restaurant_id = await getRestaurantId(req.user.id);

        if (!restaurant_id) return res.status(403).json({ message: "Access denied." });

        await db.query('UPDATE restaurants SET is_active = ? WHERE id = ?', [is_active, restaurant_id]);
        res.status(200).json({ message: `Restaurant is now ${is_active ? 'Open' : 'Closed'}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update restaurant status" });
    }
};

// @desc    Update Restaurant Profile
// @route   PUT /api/vendor/profile
// @access  Private (Vendor only)
exports.updateProfile = async (req, res) => {
    try {
        const { name, address, description, image_url, cost_for_two } = req.body;
        const restaurant_id = await getRestaurantId(req.user.id);

        if (!restaurant_id) return res.status(403).json({ message: "Access denied." });

        await db.query(
            'UPDATE restaurants SET name = ?, address = ?, description = ?, image_url = ?, cost_for_two = ? WHERE id = ?',
            [name, address, description, image_url, cost_for_two || 300, restaurant_id]
        );

        res.status(200).json({ message: "Profile updated successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update profile" });
    }
};
