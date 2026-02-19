// models/Group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String },
    
    // Tracks the total net balance of the group (all unsettled bills)
    groupNetBalance: { type: Number, default: 0 }, 

    // Members of the group
    members: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    
    admin: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Group', groupSchema);