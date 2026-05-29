const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Email regex for strict validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ['customer', 'vendor', 'delivery']; // Admin cannot self-register

// 1. REGISTER USER
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, latitude, longitude } = req.body;

        // --- Strict Validation ---
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please provide name, email and password" });
        }

        if (name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ message: "Name must be between 2 and 100 characters" });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        if (password.length > 128) {
            return res.status(400).json({ message: "Password must not exceed 128 characters" });
        }

        // Block admin self-registration — admins are created manually in DB
        const sanitizedRole = ALLOWED_ROLES.includes(role) ? role : 'customer';

        // Check if user already exists
        const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // Hash the password for security
        // 10 is the 'salt rounds' - higher is more secure but slower
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into database
        const [result] = await db.query(
            'INSERT INTO users (name, email, password_hash, role, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
            [name.trim(), email.toLowerCase().trim(), hashedPassword, sanitizedRole, latitude || null, longitude || null]
        );

        res.status(201).json({ 
            message: "User registered successfully", 
            userId: result.insertId 
        });

    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ message: "Server error during registration" });
    }
};

// 2. LOGIN USER
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password" });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }

        // Find user by email
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = users[0];

        // Compare password with hashed password in database
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Block access if suspended
        if (user.is_active === 0 || user.is_active === false) {
            return res.status(403).json({ message: "Your account has been suspended by administration." });
        }

        // Create JWT Token
        // This token will be used for authentication in future requests
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Token expires in 1 day
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: "Server error during login" });
    }
};

// @desc    Get current user's profile data (including wallet)
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        const [[user]] = await db.query('SELECT id, name, email, role, wallet, latitude, longitude FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        console.error('Profile fetch error:', error.message);
        res.status(500).json({ message: "Failed to retrieve profile information" });
    }
};
