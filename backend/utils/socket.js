const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const init = (server) => {
    io = new Server(server, {
        cors: {
            origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
            methods: ["GET", "POST", "PUT"]
        }
    });

    // --- Socket.io JWT Authentication Middleware ---
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded; // Attach user info to socket
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id, 'User ID:', socket.user?.id);

        // Join a room based on userId (for targeted updates)
        socket.on('join', (userId) => {
            // Security Check: Only allow joining your OWN room
            if (Number(userId) === Number(socket.user.id)) {
                socket.join(`user_${userId}`);
                console.log(`User ${userId} joined room: user_${userId}`);
            } else {
                console.warn(`User ${socket.user.id} tried to join room of user ${userId}`);
            }
        });

        // Join a room for a specific order
        socket.on('join_order', (orderId) => {
            // In a production app, you'd check if the user belongs to this order here.
            // For now, we trust the client, but the connection itself is at least authenticated.
            socket.join(`order_${orderId}`);
            console.log(`Socket joined room: order_${orderId}`);
        });

        // Driver broadcasts location
        socket.on('driver_location', (data) => {
            const { orderId, latitude, longitude } = data;
            // Only delivery boys should emit location
            if (socket.user.role === 'delivery') {
                io.to(`order_${orderId}`).emit('location_update', { latitude, longitude, orderId });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
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
