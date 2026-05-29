const jwt = require('jsonwebtoken');

/**
 * Middleware to verify if the user is authenticated.
 * It checks for a valid JWT token in the Authorization header.
 */
exports.verifyToken = async (req, res, next) => {
    try {
        // Get token from header: "Authorization: Bearer <token>"
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Access Denied. No token provided." });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the decoded user information (id, role) to the request object
        req.user = decoded;
        
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};

/**
 * Middleware to restrict access based on user roles.
 * Example usage: authorizeRole('admin', 'vendor')
 */
exports.authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access Denied. Required role: ${allowedRoles.join(' or ')}.` 
            });
        }
        next();
    };
};
