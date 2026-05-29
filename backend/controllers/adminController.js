const db = require('../config/db');

// @desc    Get top-level dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getDashboardStats = async (req, res) => {
    try {
        // Run multiple queries in parallel for maximum performance
        const [
            [[{ total_users }]],
            [[{ total_vendors }]],
            [[{ total_orders }]],
            [[{ total_revenue }]],
            [[{ admin_wallet }]],
            [[{ daily_orders }]],
            [orders]
        ] = await Promise.all([
            db.query('SELECT COUNT(*) as total_users FROM users'),
            db.query("SELECT COUNT(*) as total_vendors FROM users WHERE role = 'vendor'"),
            db.query('SELECT COUNT(*) as total_orders FROM orders'),
            db.query("SELECT SUM(total_amount) as total_revenue FROM orders WHERE status = 'delivered'"),
            db.query("SELECT wallet as admin_wallet FROM users WHERE id = ?", [req.user.id]),
            db.query("SELECT COUNT(*) as daily_orders FROM orders WHERE DATE(created_at) = CURDATE()"),
            db.query(`
                SELECT o.*, u.name as customer_name, r.name as restaurant_name 
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN restaurants r ON o.restaurant_id = r.id
                ORDER BY o.created_at DESC
            `)
        ]);

        const computedOrders = orders.map(o => {
            const total = Number(o.total_amount || 0);
            const deliveryFee = Number(o.delivery_fee || 0);
            const platformFee = Number(o.platform_fee || 0);
            const tax = Number(o.tax || 0);
            const foodCost = Math.max(0, total - (deliveryFee + platformFee + tax));
            
            const commRate = foodCost <= 200 ? 0.20 : 0.30;
            const adminComm = foodCost * commRate;
            
            const adminEarned = platformFee + tax + adminComm;
            const vendorEarned = foodCost - adminComm;

            return {
                ...o,
                food_cost: foodCost,
                platform_fee: platformFee,
                delivery_fee: deliveryFee,
                vendor_earned: vendorEarned,
                admin_earned: adminEarned
            };
        });

        res.status(200).json({
            total_users,
            total_vendors,
            total_orders,
            daily_orders,
            total_revenue: total_revenue || 0,
            admin_wallet: admin_wallet || 0,
            orders: computedOrders
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
};

// @desc    Suspend or Reactivate a Restaurant
// @route   PUT /api/admin/restaurants/:id/status
// @access  Private (Admin only)
exports.toggleRestaurantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body; // true or false

        // Update the soft delete 'is_active' flag we set up earlier
        const [result] = await db.query('UPDATE restaurants SET is_active = ? WHERE id = ?', [is_active, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        res.status(200).json({ 
            message: `Restaurant successfully ${is_active ? 'activated' : 'suspended'}.` 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update restaurant status" });
    }
};

// @desc    View all users across the platform
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT 
                u.id, u.name, u.email, u.role, u.is_active, u.wallet, u.created_at,

                -- Vendor: wallet IS their total lifetime earnings (credited on each order completion)
                CASE WHEN u.role = 'vendor' THEN u.wallet ELSE 0 END AS vendor_total_earned,

                -- Delivery: wallet IS their total lifetime earnings (credited on each order completion)
                CASE WHEN u.role = 'delivery' THEN u.wallet ELSE 0 END AS delivery_total_earned,

                -- Bonus: count of delivered orders for context
                COALESCE((
                    SELECT COUNT(*)
                    FROM orders o
                    JOIN restaurants r ON o.restaurant_id = r.id
                    WHERE r.user_id = u.id AND o.status = 'delivered'
                ), 0) AS vendor_orders_count,

                COALESCE((
                    SELECT COUNT(*)
                    FROM orders o
                    WHERE o.delivery_boy_id = u.id AND o.status = 'delivered'
                ), 0) AS delivery_orders_count

            FROM users u
            ORDER BY u.created_at DESC
        `);
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
};

// @desc    Block or Unblock a User
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (Number(id) === req.user.id) {
            return res.status(400).json({ message: "Security Breach: You cannot block yourself!" });
        }

        const [result] = await db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // REAL-TIME BLOCKING: Notify the user instantly
        if (is_active === 0 || is_active === false) {
            try {
                const { getIO } = require('../utils/socket');
                const io = getIO();
                io.to(id).emit('user_blocked', { message: "Your account has been temporarily suspended by the administrator." });
            } catch (socketErr) {
                console.error("Socket blocking notify failed:", socketErr);
            }
        }

        res.status(200).json({ 
            message: `User successfully ${is_active ? 'unblocked' : 'blocked'}.` 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update user status" });
    }
};

// @desc    Delete a User
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (Number(id) === req.user.id) {
            return res.status(400).json({ message: "Security Breach: You cannot delete your own account!" });
        }

        // --- ROBUST CLEANUP (CASCADE) ---
        // 1. Clear Cart
        try { await db.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM cart WHERE user_id = ?)', [id]); } catch (e) {}
        try { await db.query('DELETE FROM cart WHERE user_id = ?', [id]); } catch (e) {}
        
        // 2. Clear Profiles & Menu
        try { await db.query('DELETE FROM products WHERE restaurant_id IN (SELECT id FROM restaurants WHERE user_id = ?)', [id]); } catch (e) {}
        try { await db.query('DELETE FROM restaurants WHERE user_id = ?', [id]); } catch (e) {}
        try { await db.query('DELETE FROM delivery_profiles WHERE user_id = ?', [id]); } catch (e) {}
        try { await db.query('DELETE FROM ratings WHERE user_id = ?', [id]); } catch (e) {}

        // 3. Clear Orders
        try { await db.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ? OR delivery_boy_id = ?)', [id, id]); } catch (e) {}
        try { await db.query('DELETE FROM orders WHERE user_id = ? OR delivery_boy_id = ?', [id, id]); } catch (e) {}

        // 4. Finally Delete User
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User successfully removed from system" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete user" });
    }
};
