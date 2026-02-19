// routes/ocrRoutes.js
const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const authenticate = require('../middleware/auth'); // Correct import

// Protected route for OCR processing
router.post('/process-receipt', authenticate, ocrController.processReceipt);

// The standard export for Express router
module.exports = router;