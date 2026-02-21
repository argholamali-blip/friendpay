// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const groupRoutes = require('./routes/groupRoutes');

// Initialize Express app
const app = express();

// Middleware - allow all origins for local prototype
app.use(cors({ origin: '*', credentials: true, optionsSuccessStatus: 200 }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'FriendPay API is running',
        version: '1.0.0',
        status: 'healthy',
        db: mongoose.connection.host,
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/groups', groupRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 3000;
const ATLAS_URI = process.env.MONGODB_URI;

/**
 * Start the Express server on all network interfaces (0.0.0.0)
 * so phones on the same Wi-Fi can reach it.
 */
function startServer(dbLabel) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('🚀 ================================');
        console.log(`🚀  FriendPay API is RUNNING`);
        console.log('🚀 ================================');
        console.log(`📦  Database : ${dbLabel}`);
        console.log(`📍  Port     : ${PORT}`);
        console.log(`🌍  Env      : ${process.env.NODE_ENV || 'development'}`);
        console.log('');
    });
}

/**
 * Try to connect to MongoDB Atlas first.
 * If it fails within 5 seconds, fall back to an in-memory database.
 */
async function connectAndStart() {
    // 1. Try Atlas
    if (ATLAS_URI) {
        try {
            console.log('⏳ Connecting to MongoDB Atlas...');
            await mongoose.connect(ATLAS_URI, { serverSelectionTimeoutMS: 5000 });
            console.log('✅ Connected to MongoDB Atlas');
            startServer('Atlas (' + mongoose.connection.name + ')');
            return;
        } catch (atlasErr) {
            console.warn('⚠️  Atlas unreachable:', atlasErr.message);
            console.log('↩️  Falling back to in-memory MongoDB...');
            // Disconnect cleanly before switching
            try { await mongoose.disconnect(); } catch (_) {}
        }
    }

    // 2. Fall back to mongodb-memory-server
    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        console.log('✅ Connected to in-memory MongoDB (data resets on restart)');
        startServer('In-Memory (local prototype)');

        // Graceful shutdown for memory server
        process.on('SIGINT',  async () => { await mongoose.disconnect(); await mongod.stop(); process.exit(0); });
        process.on('SIGTERM', async () => { await mongoose.disconnect(); await mongod.stop(); process.exit(0); });
    } catch (memErr) {
        console.error('❌ Could not start in-memory MongoDB:', memErr.message);
        console.error('');
        console.error('👉  Fix: Run this in a terminal as Administrator:');
        console.error('    winget install MongoDB.Server');
        console.error('    Then restart the server.');
        process.exit(1);
    }
}

connectAndStart();

module.exports = app;
