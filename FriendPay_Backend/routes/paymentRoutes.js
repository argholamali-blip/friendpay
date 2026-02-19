// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/auth'); // Correct import

// Protected route for settling a debt
router.post('/settle', authenticate, paymentController.settleDebt);

// The standard export for Express router
module.exports = router;