// models/PendingDebt.js
const mongoose = require('mongoose');

const pendingDebtSchema = new mongoose.Schema({
    // Unique key passed in the Deep Link URL via SMS
    uniqueHash: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    }, 

    // Who paid and is owed money (the inviter/you)
    inviterId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
    // The phone number of the person who owes the money
    inviteePhoneNumber: { 
        type: String, 
        required: true 
    },
    
    // Debt details to be applied on successful registration
    debtAmount: { 
        type: Number, 
        required: true 
    },
    billDescription: { 
        type: String, 
        default: 'Dinner Split' 
    },

    // Status: Prevents the link from being used more than once
    isClaimed: { 
        type: Boolean, 
        default: false 
    },
    // Automatic cleanup after 7 days (TTL index handled by MongoDB)
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: 604800 // 7 days in seconds 
    }
});

module.exports = mongoose.model('PendingDebt', pendingDebtSchema);