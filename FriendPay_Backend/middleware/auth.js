// middleware/auth.js
const jwt = require('jsonwebtoken');

// Mock Secret Key (In production, use process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches userId to request
 */
const authenticate = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'Access denied. No token provided.' 
            });
        }

        // Extract token (remove "Bearer " prefix)
        const token = authHeader.substring(7);
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach userId to request object for use in controllers
        req.userId = decoded.userId;
        
        next(); // Continue to the controller
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expired. Please login again.' 
            });
        }
        
        return res.status(401).json({ 
            message: 'Invalid token.' 
        });
    }
};

module.exports = authenticate;