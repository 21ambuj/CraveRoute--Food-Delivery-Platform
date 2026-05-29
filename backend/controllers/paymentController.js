const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/db');

// @desc    Create a new Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
exports.createOrder = async (req, res) => {
    try {
        const { amount } = req.body; // Amount in INR

        // Initialize inside to ensure latest env variables
        const razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('your_key')) {
            return res.status(400).json({ 
                message: "Razorpay keys are missing or invalid in .env file. Please add real API keys to test payments." 
            });
        }
        
        const options = {
            amount: Math.round(amount * 100), // Razorpay works in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpayInstance.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        console.error("RAZORPAY ERROR:", error);
        res.status(500).json({ 
            message: "Failed to create payment order", 
            error: error.message 
        });
    }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        const razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment is successful! 
            // Here you can either:
            // 1. Mark an existing order as 'paid'
            // 2. Add money to the user's wallet
            
            await db.query("UPDATE users SET wallet = wallet + ? WHERE id = ?", [amount, req.user.id]);

            return res.status(200).json({ message: "Payment verified successfully and wallet credited!" });
        } else {
            return res.status(400).json({ message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to verify payment" });
    }
};

// @desc    Mock withdraw funds from wallet
// @route   POST /api/payments/withdraw
// @access  Private
exports.withdrawFunds = async (req, res) => {
    try {
        const { amount, method, destination } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid withdrawal amount" });
        }
        if (!destination) {
            return res.status(400).json({ message: "Destination account (UPI/Bank) is required" });
        }

        const [[user]] = await db.query("SELECT wallet FROM users WHERE id = ? FOR UPDATE", [req.user.id]);
        
        if (Number(user.wallet) < amount) {
            return res.status(400).json({ message: "Insufficient wallet balance for withdrawal" });
        }

        // Deduct from wallet
        await db.query("UPDATE users SET wallet = wallet - ? WHERE id = ?", [amount, req.user.id]);

        res.status(200).json({ 
            message: `Successfully withdrew Rs ${amount} to ${method} (${destination}).`,
            remaining_balance: Number(user.wallet) - amount
        });
    } catch (error) {
        console.error("Withdrawal error:", error);
        res.status(500).json({ message: "Failed to process withdrawal" });
    }
};
