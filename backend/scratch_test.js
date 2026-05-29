require('dotenv').config();
const db = require('./config/db');

async function test() {
    try {
        try {
            await db.query('ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(6) NULL');
            console.log("Migration successful: Added delivery_otp");
        } catch (err) {
            console.log("Error or already exists:", err.message);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
