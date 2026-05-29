const db = require('./backend/config/db');

async function migrate() {
    try {
        console.log("🚀 Starting Database Migration...");
        
        // 1. Add columns to 'orders' table
        try {
            await db.query(`ALTER TABLE orders ADD COLUMN razorpay_order_id VARCHAR(255) NULL`);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        }
        try {
            await db.query(`ALTER TABLE orders ADD COLUMN razorpay_payment_id VARCHAR(255) NULL`);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        }
        try {
            await db.query(`ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10, 2) DEFAULT 0.00`);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        }
        try {
            await db.query(`ALTER TABLE orders ADD COLUMN tax DECIMAL(10, 2) DEFAULT 0.00`);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        }
        try {
            await db.query(`ALTER TABLE orders ADD COLUMN platform_fee DECIMAL(10, 2) DEFAULT 0.00`);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        }
        try {
            await db.query(`ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(6) NULL`);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        }

        // 2. Add columns to 'restaurants' table
        try {
            await db.query(`ALTER TABLE restaurants ADD COLUMN tags VARCHAR(255) DEFAULT '[]'`);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        }
        try {
            await db.query(`ALTER TABLE restaurants ADD COLUMN cost_for_two INT DEFAULT 300`);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        }
        
        console.log("✅ Database Migrated Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error.message);
        process.exit(1);
    }
}

migrate();
