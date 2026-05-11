const db = require('./config/db');

async function getUsers() {
    try {
        const [users] = await db.query("SELECT id, name, email, role FROM users");
        console.log(users);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

getUsers();
