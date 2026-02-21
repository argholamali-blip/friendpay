// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth'); // Correct standard middleware

// Public routes (no authentication required)
router.post('/register', userController.registerAndApplyDebt);
router.post('/login', userController.login);

// Protected routes (authentication required)
router.post('/send-link', authenticate, userController.sendLinkAndNotify);
router.get('/dashboard', authenticate, userController.getDashboardData);
router.post('/find-by-phone', authenticate, userController.findByPhone);

// FINAL FIX: Export the router directly and cleanly.
module.exports = router;