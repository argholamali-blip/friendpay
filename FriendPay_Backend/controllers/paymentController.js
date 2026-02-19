// controllers/paymentController.js
const User = require('../models/User');
const mongoose = require('mongoose');

// --- Settle a debt between two users ---
exports.settleDebt = async (req, res) => {
    const { debtToId, amount } = req.body;
    const payerId = req.userId; 
    const paymentAmount = parseFloat(amount);
    
    if (payerId === debtToId || paymentAmount <= 0) {
        return res.status(400).json({ message: 'Invalid payment parameters.' });
    }
    
    // Start Mongoose Transaction for Atomic Financial Updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Debtor (Payer) Balance Adjustment 
        const payerUpdate = await User.findByIdAndUpdate(payerId, 
            { $inc: { netBalance: paymentAmount } }, 
            { session, new: true }
        ).lean(); // Use .lean() for faster object retrieval

        // 2. Creditor (Receiver) Balance Adjustment 
        const receiverUpdate = await User.findByIdAndUpdate(debtToId, 
            { $inc: { netBalance: -paymentAmount } }, 
            { session, new: true }
        ).lean();

        if (!payerUpdate || !receiverUpdate) {
            throw new Error("One or both users not found.");
        }

        await session.commitTransaction();
        
        // --- FIX: Calculate the accurate final balance for the display ---
        const payerFinalBalance = payerUpdate.netBalance;

        res.status(200).json({ 
            message: `Settlement successful. ${receiverUpdate.fullName} received ${paymentAmount.toLocaleString()} Toman.`,
            payerNewBalance: payerFinalBalance
        });

    } catch (error) {
        if (session) await session.abortTransaction(); 
        console.error("Settlement Transaction Failed:", error);
        res.status(500).json({ message: 'Settlement failed due to server error or transaction rollback.' });
    } finally {
        if (session) session.endSession();
    }
};