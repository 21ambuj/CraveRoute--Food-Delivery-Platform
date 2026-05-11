const { Server } = require('socket.io');

let io;

const init = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // In production, replace with your frontend URL
            methods: ["GET", "POST", "PUT"]
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Join a room based on userId (for targeted updates)
        socket.on('join', (userId) => {
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined room: user_${userId}`);
        });

        // Join a room for a specific order
        socket.on('join_order', (orderId) => {
            socket.join(`order_${orderId}`);
            console.log(`Socket joined room: order_${orderId}`);
        });

        // Driver broadcasts location
        socket.on('driver_location', (data) => {
            const { orderId, latitude, longitude } = data;
            // Broadcast to the customer in the order room
            io.to(`order_${orderId}`).emit('location_update', { latitude, longitude });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { init, getIO };
