const db = require('./backend/config/db');

async function seed() {
    try {
        await db.query('UPDATE restaurants SET tags = ?, cost_for_two = ?, rating = ? WHERE id = ?', ['["Pure Veg", "North Indian"]', 200, 4.5, 1]);
        await db.query('UPDATE restaurants SET tags = ?, cost_for_two = ?, rating = ? WHERE id = ?', ['["Fast Food", "Burgers"]', 500, 3.8, 2]);
        await db.query('UPDATE restaurants SET tags = ?, cost_for_two = ?, rating = ? WHERE id = ?', ['["Desserts", "Healthy"]', 150, 4.2, 3]);
        // Default seed for the rest
        await db.query('UPDATE restaurants SET tags = ? WHERE tags = ?', ['["Multicuisine"]', '[]']);
        console.log("Seeded successfully");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
