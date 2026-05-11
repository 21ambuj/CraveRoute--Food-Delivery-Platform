const db = require('../config/db');
const { getDistance } = require('../utils/location');

// @desc    Place a new order (Secure SQL Transaction)
// @route   POST /api/orders
// @access  Private (Customer only)
exports.placeOrder = async (req, res) => {
    // We use a specific connection for Transactions to ensure data integrity
    const connection = await db.getConnection();
    try {
        // Start SQL Transaction. If any step fails, we rollback everything.
        await connection.beginTransaction();

        const { restaurant_id, items, total_amount, razorpay_order_id, razorpay_payment_id } = req.body;
        const user_id = req.user.id; // From our authMiddleware

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Order must contain items" });
        }

        // 1. Calculate Delivery Time based on Geolocation
        const [[user]] = await connection.query('SELECT latitude, longitude FROM users WHERE id = ?', [user_id]);
        const [[restaurant]] = await connection.query('SELECT latitude, longitude FROM restaurants WHERE id = ?', [restaurant_id]);

        let delivery_time_minutes = 45; // Default fallback
        
        if (user && restaurant && user.latitude && restaurant.latitude) {
            const distance = getDistance(user.latitude, user.longitude, restaurant.latitude, restaurant.longitude);
            
            // Startup Level Logic: Dynamic routing estimates
            if (distance <= 3) {
                delivery_time_minutes = 30; // Within 3km is fast
            } else if (distance <= 7) {
                delivery_time_minutes = 45; // Standard distance
            } else {
                delivery_time_minutes = 60; // Far delivery
            }
        }

        // 2. Create the Order Record (Include Payment IDs)
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, restaurant_id, total_amount, delivery_time_minutes, status, razorpay_order_id, razorpay_payment_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, restaurant_id, total_amount, delivery_time_minutes, 'pending', razorpay_order_id, razorpay_payment_id]
        );
        const orderId = orderResult.insertId;

        // 3. Create the Order Items Records
        for (let item of items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        // 4. Commit the Transaction (Save permanently)
        await connection.commit();

        // 5. Notify Vendor via Socket
        try {
            const { getIO } = require('../utils/socket');
            const io = getIO();
            const [[vendor]] = await connection.query('SELECT user_id FROM restaurants WHERE id = ?', [restaurant_id]);
            if (vendor) {
                io.to(vendor.user_id).emit('vendor_order_update', {
                    orderId,
                    message: "New Order Received!"
                });
            }
        } catch (socketErr) {
            console.error("Socket notification failed:", socketErr);
        }

        res.status(201).json({ 
            message: "Order placed successfully!", 
            orderId, 
            estimated_delivery: `${delivery_time_minutes} minutes` 
        });

    } catch (error) {
        // If ANYTHING goes wrong (e.g. database disconnects halfway), undo the order!
        await connection.rollback();
        console.error("Order Transaction Failed: ", error);
        res.status(500).json({ message: "Failed to place order. Transaction rolled back." });
    } finally {
        // Release connection back to the pool
        connection.release();
    }
};

// @desc    Get logged in user's order history
// @route   GET /api/orders/myorders
// @access  Private (Customer only)
exports.getUserOrders = async (req, res) => {
    try {
        const user_id = req.user.id;
        const [orders] = await db.query(`
            SELECT o.*, 
                   r.name as restaurant_name, r.latitude as restaurant_lat, r.longitude as restaurant_lng,
                   d.name as delivery_boy_name, d.latitude as delivery_boy_lat, d.longitude as delivery_boy_lng
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            LEFT JOIN users d ON o.delivery_boy_id = d.id
            WHERE o.user_id = ? 
            ORDER BY o.created_at DESC
        `, [user_id]);
        
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// @desc    Cancel an order
// @route   PUT /api/orders/:orderId/cancel
// @access  Private (Customer only)
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const user_id = req.user.id;

        const [[order]] = await db.query('SELECT status, user_id, total_amount FROM orders WHERE id = ?', [orderId]);
        if (!order) return res.status(404).json({ message: "Order not found" });
        if (order.user_id !== user_id) return res.status(403).json({ message: "Unauthorized" });

        if (!['pending', 'preparing'].includes(order.status)) {
            return res.status(400).json({ message: "Cannot cancel after pickup." });
        }

        const originalAmount = Number(order.total_amount);

        if (order.status === 'preparing') {
            const vendorShare = originalAmount * 0.70;
            const customerRefund = originalAmount * 0.30;

            await db.query("UPDATE orders SET status = 'cancelled', total_amount = ? WHERE id = ?", [vendorShare, orderId]);
            await db.query("UPDATE users SET wallet = wallet + ? WHERE id = ?", [customerRefund, user_id]);

            return res.status(200).json({ message: "Order cancelled. 70% penalty applied, 30% refunded to wallet." });
        } else {
            await db.query("UPDATE orders SET status = 'cancelled', total_amount = 0 WHERE id = ?", [orderId]);
            await db.query("UPDATE users SET wallet = wallet + ? WHERE id = ?", [originalAmount, user_id]);

            return res.status(200).json({ message: "Order cancelled successfully. 100% refunded to wallet." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to cancel order" });
    }
};
