const db = require('./backend/config/db');

async function migrate() {
    try {
        console.log("🚀 Starting Database Migration...");
        
        // 1. Add columns to 'orders' table
        await db.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255), 
            ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255)
        `);
        
        console.log("✅ Database Migrated Successfully! Missing columns added.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error.message);
        process.exit(1);
    }
}

migrate();
