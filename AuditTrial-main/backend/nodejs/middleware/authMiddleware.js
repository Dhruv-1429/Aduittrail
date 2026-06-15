const jwt = require('jsonwebtoken');

// Match the exact secret string from Spring Boot JwtUtil.java
const JWT_SECRET = 'your-very-secret-key-that-should-be-long-and-complex-12345678';

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            email: decoded.sub,
            role: decoded.role
        };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
}

// Middleware to strictly enforce ADMIN role
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
}

module.exports = { authMiddleware, requireAdmin };
