// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // --- Identification & Authentication ---
    phoneNumber: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    fullName: { 
        type: String, 
        required: true,
        trim: true 
    },
    passwordHash: { 
        type: String, 
        required: true 
    }, 
    
    // --- Financial Status (Core Business Logic) ---
    // Wallet: Virtual balance in the app (for instant P2P payments)
    walletBalance: { 
        type: Number, 
        default: 0 
    }, 
    // Net Balance: Aggregated debt/credit across all friends (for Home view)
    netBalance: { 
        type: Number, 
        default: 0 
    }, 

    // --- Social & Verification ---
    friends: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    isVerified: { // Confirms the account has completed signup
        type: Boolean, 
        default: false 
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);