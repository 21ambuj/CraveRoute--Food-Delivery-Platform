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

        const { restaurant_id, items, razorpay_order_id, razorpay_payment_id, payment_method } = req.body;
        const user_id = req.user.id; // From our authMiddleware

        if (!restaurant_id) {
            return res.status(400).json({ message: "Restaurant ID is required" });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Order must contain items" });
        }

        // --- SERVER-SIDE PRICE RECALCULATION (Security Fix) ---
        // Never trust the frontend's total_amount. Recalculate from DB prices.
        let total_amount = 0;
        for (const item of items) {
            if (!item.product_id || !item.quantity || item.quantity < 1) {
                await connection.rollback();
                return res.status(400).json({ message: "Each item must have a valid product_id and quantity >= 1" });
            }

            const [[product]] = await connection.query(
                'SELECT price, restaurant_id FROM products WHERE id = ? AND is_active = TRUE',
                [item.product_id]
            );

            if (!product) {
                await connection.rollback();
                return res.status(400).json({ message: `Product with ID ${item.product_id} not found or unavailable` });
            }

            // Ensure all items are from the same restaurant
            if (Number(product.restaurant_id) !== Number(restaurant_id)) {
                await connection.rollback();
                return res.status(400).json({ message: "All items must be from the same restaurant" });
            }

            item.price = Number(product.price); // Use DB price, not frontend price
            total_amount += item.price * item.quantity;
        }

        // 1. Calculate Delivery Time and Dynamic Delivery Fee based on Geolocation
        const [[user]] = await connection.query('SELECT latitude, longitude FROM users WHERE id = ?', [user_id]);
        const [[restaurant]] = await connection.query('SELECT latitude, longitude FROM restaurants WHERE id = ?', [restaurant_id]);

        let delivery_time_minutes = 45; // Default fallback
        let deliveryFee = 25; // Base fee
        
        if (user && restaurant && user.latitude && restaurant.latitude) {
            const distance = getDistance(Number(user.latitude), Number(user.longitude), Number(restaurant.latitude), Number(restaurant.longitude));
            
            // Startup Level Logic: Dynamic routing estimates
            if (distance <= 3) {
                delivery_time_minutes = 30; // Within 3km is fast
            } else if (distance <= 7) {
                delivery_time_minutes = 45; // Standard distance
            } else {
                delivery_time_minutes = 60; // Far delivery
            }

            // Dynamic delivery fee calculation (matches frontend)
            if (distance > 3) {
                deliveryFee = 25 + Math.ceil(distance - 3) * 10;
            }
        }

        const food_total = total_amount; // Recalculated sum of items
        const platform_fee = 3.00;
        const tax = Number((food_total * 0.05).toFixed(2));
        const grand_total = Number((food_total + deliveryFee + platform_fee + tax).toFixed(2));

        if (payment_method === 'wallet') {
            const [[userWallet]] = await connection.query('SELECT wallet FROM users WHERE id = ? FOR UPDATE', [user_id]);
            if (Number(userWallet.wallet) < grand_total) {
                await connection.rollback();
                return res.status(400).json({ message: `Insufficient wallet balance. Need Rs ${grand_total}, but you only have Rs ${Number(userWallet.wallet).toFixed(2)}.` });
            }
            // Deduct full amount from wallet
            await connection.query('UPDATE users SET wallet = wallet - ? WHERE id = ?', [grand_total, user_id]);
        } else if (payment_method === 'wallet_online') {
            // Partial wallet deduction
            const [[userWallet]] = await connection.query('SELECT wallet FROM users WHERE id = ? FOR UPDATE', [user_id]);
            const walletBalance = Number(userWallet.wallet);
            if (walletBalance > 0) {
                const deductAmount = Math.min(walletBalance, grand_total);
                await connection.query('UPDATE users SET wallet = wallet - ? WHERE id = ?', [deductAmount, user_id]);
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Create the Order Record (Include Payment IDs and detailed fees breakdown)
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, restaurant_id, total_amount, delivery_fee, tax, platform_fee, delivery_time_minutes, status, delivery_otp, razorpay_order_id, razorpay_payment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, restaurant_id, grand_total, deliveryFee, tax, platform_fee, delivery_time_minutes, 'pending', otp, razorpay_order_id || null, razorpay_payment_id || null]
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
            const [[vendor]] = await db.query('SELECT user_id FROM restaurants WHERE id = ?', [restaurant_id]);
            if (vendor) {
                io.to(`user_${vendor.user_id}`).emit('vendor_order_update', {
                    orderId,
                    message: "New Order Received!"
                });
            }
        } catch (socketErr) {
            console.error("Socket notification failed:", socketErr.message);
        }

        res.status(201).json({ 
            message: "Order placed successfully!", 
            orderId, 
            estimated_delivery: `${delivery_time_minutes} minutes` 
        });

    } catch (error) {
        // If ANYTHING goes wrong (e.g. database disconnects halfway), undo the order!
        await connection.rollback();
        console.error("Order Transaction Failed:", error.message);
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
                   r.name as restaurant_name, r.address as restaurant_address, r.image_url as restaurant_image,
                   r.latitude as restaurant_lat, r.longitude as restaurant_lng,
                   d.name as delivery_boy_name, d.id as delivery_boy_id,
                   rt.rating as given_rating
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            LEFT JOIN users d ON o.delivery_boy_id = d.id
            LEFT JOIN ratings rt ON o.id = rt.order_id
            WHERE o.user_id = ? 
            ORDER BY o.created_at DESC
        `, [user_id]);
        
        res.status(200).json(orders);
    } catch (error) {
        console.error('Fetch orders error:', error.message);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// @desc    Cancel an order (Secure SQL Transaction)
// @route   PUT /api/orders/:orderId/cancel
// @access  Private (Customer only)
exports.cancelOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { orderId } = req.params;
        const user_id = req.user.id;

        const [[order]] = await connection.query('SELECT status, user_id, total_amount FROM orders WHERE id = ? FOR UPDATE', [orderId]);
        if (!order) {
            await connection.rollback();
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.user_id !== user_id) {
            await connection.rollback();
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (!['pending', 'preparing'].includes(order.status)) {
            await connection.rollback();
            return res.status(400).json({ message: "Cannot cancel after pickup." });
        }

        const originalAmount = Number(order.total_amount);

        if (order.status === 'preparing') {
            const vendorShare = originalAmount * 0.70;
            const customerRefund = originalAmount * 0.30;

            await connection.query("UPDATE orders SET status = 'cancelled', total_amount = ? WHERE id = ?", [vendorShare, orderId]);
            await connection.query("UPDATE users SET wallet = wallet + ? WHERE id = ?", [customerRefund, user_id]);

            await connection.commit();
            return res.status(200).json({ message: "Order cancelled. 70% penalty applied, 30% refunded to wallet." });
        } else {
            await connection.query("UPDATE orders SET status = 'cancelled', total_amount = 0 WHERE id = ?", [orderId]);
            await connection.query("UPDATE users SET wallet = wallet + ? WHERE id = ?", [originalAmount, user_id]);

            await connection.commit();
            return res.status(200).json({ message: "Order cancelled successfully. 100% refunded to wallet." });
        }
    } catch (error) {
        await connection.rollback();
        console.error('Cancel order error:', error.message);
        res.status(500).json({ message: "Failed to cancel order" });
    } finally {
        connection.release();
    }
};
