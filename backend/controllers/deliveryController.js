const db = require('../config/db');

// @desc    Create or update Delivery Boy profile (vehicle details)
// @route   POST /api/delivery/profile
// @access  Private (Delivery only)
exports.updateProfile = async (req, res) => {
    try {
        const { vehicle_type, vehicle_number, is_available } = req.body;
        
        // Check if profile exists
        const [[profile]] = await db.query('SELECT id FROM delivery_profiles WHERE user_id = ?', [req.user.id]);
        
        if (profile) {
            await db.query(
                'UPDATE delivery_profiles SET vehicle_type=?, vehicle_number=?, is_available=? WHERE user_id=?',
                [vehicle_type, vehicle_number, is_available, req.user.id]
            );
        } else {
            await db.query(
                'INSERT INTO delivery_profiles (user_id, vehicle_type, vehicle_number, is_available) VALUES (?, ?, ?, ?)',
                [req.user.id, vehicle_type, vehicle_number, is_available]
            );
        }
        res.status(200).json({ message: "Delivery profile updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update profile" });
    }
};

// @desc    Get all available unassigned orders
// @route   GET /api/delivery/orders/available
// @access  Private (Delivery only)
exports.getAvailableOrders = async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, 
                   r.name as restaurant_name, r.address as restaurant_address, r.latitude as restaurant_lat, r.longitude as restaurant_lng,
                   u.name as customer_name, u.latitude as customer_lat, u.longitude as customer_lng
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            JOIN users u ON o.user_id = u.id
            WHERE o.delivery_boy_id IS NULL AND o.status IN ('pending', 'preparing') 
            ORDER BY o.created_at ASC
        `);
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch available orders" });
    }
};

// @desc    Get current active order for the delivery partner
// @route   GET /api/delivery/orders/active
// @access  Private (Delivery only)
exports.getActiveOrder = async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, 
                   r.name as restaurant_name, r.address as restaurant_address, r.latitude as restaurant_lat, r.longitude as restaurant_lng,
                   u.name as customer_name, u.latitude as customer_lat, u.longitude as customer_lng
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            JOIN users u ON o.user_id = u.id
            WHERE o.delivery_boy_id = ? AND o.status IN ('accepted', 'out_for_delivery') 
            LIMIT 1
        `, [req.user.id]);
        res.status(200).json(orders[0] || null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch active order" });
    }
};

// @desc    Accept an order for delivery
// @route   PUT /api/delivery/orders/:orderId/accept
// @access  Private (Delivery only)
exports.acceptOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Concurrency check: Ensure order is not already taken by someone else!
        const [[order]] = await db.query('SELECT delivery_boy_id FROM orders WHERE id = ? FOR UPDATE', [orderId]);
        if (!order) return res.status(404).json({ message: "Order not found" });
        if (order.delivery_boy_id) return res.status(400).json({ message: "Order already assigned to another partner" });

        // Assign to this delivery boy and update status to 'accepted'
        await db.query(
            "UPDATE orders SET delivery_boy_id = ?, status = 'accepted' WHERE id = ?",
            [req.user.id, orderId]
        );

        // Real-time notification
        const { getIO } = require('../utils/socket');
        const io = getIO();
        const [[orderInfo]] = await db.query('SELECT user_id, restaurant_id FROM orders WHERE id = ?', [orderId]);
        if (orderInfo) {
            // Notify customer
            io.to(`user_${orderInfo.user_id}`).emit('order_update', {
                orderId,
                status: 'accepted',
                message: "A delivery partner has accepted your order!"
            });
            // Notify vendor (so they know who is coming)
            const [[vendor]] = await db.query('SELECT user_id FROM restaurants WHERE id = ?', [orderInfo.restaurant_id]);
            if (vendor) {
                io.to(`user_${vendor.user_id}`).emit('vendor_order_update', {
                    orderId,
                    status: 'accepted',
                    delivery_boy_id: req.user.id
                });
            }
            io.to(`order_${orderId}`).emit('status_change', { status: 'accepted' });
        }

        res.status(200).json({ message: "Order accepted! Head over to the restaurant." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to accept order" });
    }
};

// @desc    Pickup an order (Out of Pickup)
// @route   PUT /api/delivery/orders/:orderId/pickup
// @access  Private (Delivery only)
exports.pickupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Security check: Ensure this specific delivery boy owns this order
        const [[order]] = await db.query('SELECT id FROM orders WHERE id = ? AND delivery_boy_id = ?', [orderId, req.user.id]);
        if (!order) return res.status(403).json({ message: "Unauthorized or order not found" });

        // Transition from 'accepted' to 'out_for_delivery'
        await db.query("UPDATE orders SET status = 'out_for_delivery' WHERE id = ?", [orderId]);

        // Real-time notification
        const { getIO } = require('../utils/socket');
        const io = getIO();
        const [[orderInfo]] = await db.query('SELECT user_id FROM orders WHERE id = ?', [orderId]);
        if (orderInfo) {
            io.to(`user_${orderInfo.user_id}`).emit('order_update', {
                orderId,
                status: 'out_for_delivery',
                message: "Your order is picked up and out for delivery!"
            });
            io.to(`order_${orderId}`).emit('status_change', { status: 'out_for_delivery' });
        }

        res.status(200).json({ message: "Order picked up! Out for delivery." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to pickup order" });
    }
};

// @desc    Mark order as delivered (Secure SQL Transaction for wallet splits)
// @route   PUT /api/delivery/orders/:orderId/complete
// @access  Private (Delivery only)
exports.completeOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { orderId } = req.params;
        const { otp } = req.body;
        
        // Security check: Ensure this specific delivery boy owns this order
        const [[order]] = await connection.query(
            'SELECT id, restaurant_id, total_amount, delivery_fee, tax, platform_fee, user_id, delivery_otp FROM orders WHERE id = ? AND delivery_boy_id = ?',
            [orderId, req.user.id]
        );
        if (!order) {
            await connection.rollback();
            return res.status(403).json({ message: "Unauthorized or order not found" });
        }

        // OTP Verification
        if (order.delivery_otp && String(order.delivery_otp) !== String(otp)) {
            await connection.rollback();
            return res.status(400).json({ message: "Invalid OTP. Please ask the customer for the correct 6-digit delivery PIN." });
        }

        const overallTotal = Number(order.total_amount);
        const deliveryFee = Number(order.delivery_fee || 0);
        const platformFee = Number(order.platform_fee || 0);
        const tax = Number(order.tax || 0);
        
        // Exact Food Cost is total minus fees and tax
        const foodCost = Math.max(0, overallTotal - (deliveryFee + platformFee + tax));

        // Determine 20% or 30% commission rate
        const commRate = foodCost <= 200 ? 0.20 : 0.30;
        const adminComm = foodCost * commRate;
        
        // Admin gets platform fee + GST tax + admin commission split
        const adminRevenue = platformFee + tax + adminComm;
        const vendorRevenue = foodCost - adminComm;
        const driverRevenue = deliveryFee;

        // Update order status
        await connection.query("UPDATE orders SET status = 'delivered' WHERE id = ?", [orderId]);

        // 1. Admin Wallet
        const [[admin]] = await connection.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (admin) {
            await connection.query("UPDATE users SET wallet = wallet + ? WHERE id = ?", [adminRevenue, admin.id]);
        }

        // 2. Delivery Boy Wallet
        await connection.query("UPDATE users SET wallet = wallet + ? WHERE id = ?", [driverRevenue, req.user.id]);

        // 3. Vendor Wallet
        const [[restaurant]] = await connection.query("SELECT user_id FROM restaurants WHERE id = ?", [order.restaurant_id]);
        if (restaurant) {
            await connection.query("UPDATE users SET wallet = wallet + ? WHERE id = ?", [vendorRevenue, restaurant.user_id]);
        }

        // Commit all wallet updates atomically
        await connection.commit();

        // Real-time notification (outside transaction — non-critical)
        try {
            const { getIO } = require('../utils/socket');
            const io = getIO();
            io.to(`user_${order.user_id}`).emit('order_update', {
                orderId,
                status: 'delivered',
                message: "Order delivered! Enjoy your meal."
            });
            io.to(`order_${orderId}`).emit('status_change', { status: 'delivered' });
        } catch (socketErr) {
            console.error("Socket notification failed:", socketErr.message);
        }

        res.status(200).json({ message: "Delivery completed successfully!" });
    } catch (error) {
        await connection.rollback();
        console.error('Complete order error:', error.message);
        res.status(500).json({ message: "Failed to complete order" });
    } finally {
        connection.release();
    }
};

// @desc    Get delivery history for the delivery partner
// @route   GET /api/delivery/orders/history
// @access  Private (Delivery only)
exports.getDeliveryHistory = async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, 
                   r.name as restaurant_name, r.address as restaurant_address, r.latitude as restaurant_lat, r.longitude as restaurant_lng,
                   u.name as customer_name, u.latitude as customer_lat, u.longitude as customer_lng
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            JOIN users u ON o.user_id = u.id
            WHERE o.delivery_boy_id = ? AND o.status = 'delivered'
            ORDER BY o.created_at DESC
        `, [req.user.id]);
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch delivery history" });
    }
};

// @desc    Toggle Delivery Partner Availability (Online/Offline)
// @route   PUT /api/delivery/availability
// @access  Private (Delivery only)
exports.toggleAvailability = async (req, res) => {
    try {
        const { is_available } = req.body;
        
        // Check if profile exists
        const [[profile]] = await db.query('SELECT id FROM delivery_profiles WHERE user_id = ?', [req.user.id]);
        
        if (profile) {
            await db.query(
                'UPDATE delivery_profiles SET is_available = ? WHERE user_id = ?',
                [is_available, req.user.id]
            );
        } else {
            await db.query(
                'INSERT INTO delivery_profiles (user_id, is_available) VALUES (?, ?)',
                [req.user.id, is_available]
            );
        }
        
        res.status(200).json({ message: `You are now ${is_available ? 'Online' : 'Offline'}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update availability" });
    }
};

// @desc    Get Delivery Partner Profile
// @route   GET /api/delivery/profile
// @access  Private (Delivery only)
exports.getProfile = async (req, res) => {
    try {
        const [[profile]] = await db.query('SELECT * FROM delivery_profiles WHERE user_id = ?', [req.user.id]);
        res.status(200).json(profile || { is_available: false });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};
// @desc    Update Delivery Boy live GPS coordinates
// @route   PUT /api/delivery/location
// @access  Private (Delivery only)
exports.updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        await db.query(
            'UPDATE users SET latitude = ?, longitude = ? WHERE id = ?',
            [latitude, longitude, req.user.id]
        );

        // Real-time broadcast to any orders assigned to this delivery boy
        const { getIO } = require('../utils/socket');
        const io = getIO();
        
        // Find active orders for this driver
        const [activeOrders] = await db.query(
            "SELECT id, user_id FROM orders WHERE delivery_boy_id = ? AND status IN ('accepted', 'out_for_delivery')",
            [req.user.id]
        );

        activeOrders.forEach(order => {
            // Broadcast location to the specific order channel
            io.to(`order_${order.id}`).emit('location_update', {
                latitude,
                longitude,
                orderId: order.id
            });
            // Also notify the customer directly
            io.to(`user_${order.user_id}`).emit('driver_location', {
                latitude,
                longitude,
                orderId: order.id
            });
        });

        res.status(200).json({ message: "Location synchronized" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to sync location" });
    }
};
