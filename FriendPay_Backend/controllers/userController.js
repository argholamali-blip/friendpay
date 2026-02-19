// controllers/userController.js
const User = require('../models/User');
const PendingDebt = require('../models/PendingDebt');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');

// FIXED: Use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

// --- 1. Send Debt Link (Initial Invitation via SMS) ---
exports.sendLinkAndNotify = async (req, res) => {
    const { inviteePhoneNumber, debtAmount, billDescription } = req.body;
    const inviterId = req.userId;

    if (!debtAmount || !inviteePhoneNumber) {
        return res.status(400).json({ 
            message: 'Debt amount and phone number are required.',
            missing: {
                debtAmount: !debtAmount,
                inviteePhoneNumber: !inviteePhoneNumber
            }
        });
    }

    if (isNaN(parseFloat(debtAmount)) || parseFloat(debtAmount) <= 0) {
        return res.status(400).json({ message: 'Invalid debt amount.' });
    }

    try {
        const uniqueHash = crypto.randomBytes(16).toString('hex');
        
        const pendingDebt = new PendingDebt({
            uniqueHash,
            inviterId,
            inviteePhoneNumber,
            debtAmount: parseFloat(debtAmount),
            billDescription: billDescription || 'Shared expense'
        });
        await pendingDebt.save();

        const deepLinkUrl = `friendpayapp://register?token=${uniqueHash}&phone=${inviteePhoneNumber}`;

        const inviterUser = await User.findById(inviterId);
        const inviterName = inviterUser ? inviterUser.fullName : 'دوست شما';
        
        const smsMessage = 
            `سلام! ${inviterName} مبلغ ${debtAmount.toLocaleString()} ت را از شما طلب دارد. برای پرداخت و ثبت نام، کلیک کنید: ${deepLinkUrl}`;
        
        console.log(`[SMS MOCK] Sending to ${inviteePhoneNumber}: ${smsMessage}`);

        res.status(200).json({ 
            success: true,
            message: 'Deep Link generated. User needs to click link to register.', 
            deepLink: deepLinkUrl,
            hash: uniqueHash
        });

    } catch (error) {
        console.error("Error creating debt link:", error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create debt invitation.', 
            error: error.message 
        });
    }
};

// --- 2. Register New User & Apply Debt ---
exports.registerAndApplyDebt = async (req, res) => {
    const { phoneNumber, fullName, password, deepLinkToken } = req.body;
    
    if (!phoneNumber || !fullName || !password) {
        return res.status(400).json({ 
            message: 'Phone number, full name, and password are required.',
            missing: {
                phoneNumber: !phoneNumber,
                fullName: !fullName,
                password: !password
            }
        });
    }

    // Validate phone number format (Iranian phone numbers)
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ 
            message: 'Invalid phone number format. Must be 11 digits starting with 09.' 
        });
    }

    // Validate password strength
    if (password.length < 6) {
        return res.status(400).json({ 
            message: 'Password must be at least 6 characters long.' 
        });
    }

    let session;

    try {
        let pendingDebt = null;

        // --- A. Handle Direct Registration (First User/Inviter) ---
        if (!deepLinkToken || deepLinkToken === 'placeholder') {
            let user = await User.findOne({ phoneNumber });
            if (user && user.isVerified) {
                 return res.status(400).json({ message: 'Account already exists for this phone number.' });
            }
            
            const passwordHash = await bcrypt.hash(password, 10);
            user = new User({ phoneNumber, fullName, passwordHash, isVerified: true });
            await user.save();
            
            const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

            return res.status(201).json({ 
                success: true,
                token, 
                userId: user._id,
                fullName: user.fullName,
                message: "User registered successfully (Inviter account created).",
                isInviter: true
            });
        }

        // --- B. Handle Debt-Based Registration (Invitee/Friend) ---
        pendingDebt = await PendingDebt.findOne({ 
            uniqueHash: deepLinkToken,
            inviteePhoneNumber: phoneNumber,
            isClaimed: false 
        });

        if (!pendingDebt) {
            return res.status(400).json({ 
                message: 'Invalid, expired, or already claimed invitation link.' 
            });
        }
        
        let user = await User.findOne({ phoneNumber });
        if (user && user.isVerified) {
             return res.status(400).json({ 
                 message: 'Account already exists for this phone number.' 
             });
        }
        
        // Start Mongoose Transaction
        session = await mongoose.startSession();
        session.startTransaction();

        const passwordHash = await bcrypt.hash(password, 10);
        
        if (!user) {
            user = new User({ phoneNumber, fullName, passwordHash, isVerified: true });
        } else {
            user.fullName = fullName;
            user.passwordHash = passwordHash;
            user.isVerified = true;
        }
        await user.save({ session });

        const debtAmount = pendingDebt.debtAmount;

        // Update Creditor (Inviter) Net Balance
        await User.findByIdAndUpdate(pendingDebt.inviterId, {
            $inc: { netBalance: debtAmount }
        }, { session });

        // Update Debtor (New User) Net Balance
        await User.findByIdAndUpdate(user._id, {
            $inc: { netBalance: -debtAmount }
        }, { session });
        
        // Mark Debt as Claimed
        pendingDebt.isClaimed = true;
        await pendingDebt.save({ session });

        // Create Friendship link
        await User.findByIdAndUpdate(
            user._id, 
            { $addToSet: { friends: pendingDebt.inviterId } }, 
            { session }
        );
        await User.findByIdAndUpdate(
            pendingDebt.inviterId, 
            { $addToSet: { friends: user._id } }, 
            { session }
        );

        await session.commitTransaction();
        
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ 
            success: true,
            token, 
            userId: user._id,
            fullName: user.fullName,
            message: `Account created successfully. You now owe ${debtAmount.toLocaleString()} Toman for ${pendingDebt.billDescription}.`,
            debt: debtAmount,
            billDescription: pendingDebt.billDescription
        });

    } catch (error) {
        if (session) await session.abortTransaction();
        console.error("Registration and Debt Apply Error:", error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during registration process.', 
            detail: error.message 
        });
    } finally {
        if (session) session.endSession();
    }
};

// --- 3. Login ---
exports.login = async (req, res) => {
    const { phoneNumber, password } = req.body;
    
    if (!phoneNumber || !password) {
        return res.status(400).json({ 
            message: 'Phone number and password are required.' 
        });
    }

    try {
        const user = await User.findOne({ phoneNumber });
        if (!user || !user.isVerified) {
            return res.status(401).json({ 
                message: 'Invalid phone number or account not verified.' 
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(200).json({ 
            success: true,
            token, 
            userId: user._id, 
            fullName: user.fullName, 
            phoneNumber: user.phoneNumber,
            message: "Login successful." 
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login.' 
        });
    }
};

// --- 4. Get Dashboard Data ---
exports.getDashboardData = async (req, res) => {
    const userId = req.userId;

    try {
        const user = await User.findById(userId)
            .select('fullName phoneNumber netBalance walletBalance friends')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const friendDetails = await User.find({
            _id: { $in: user.friends }
        }).select('fullName phoneNumber netBalance').lean();
        
        const netBalance = user.netBalance || 0;
        const totalOwedToYou = netBalance > 0 ? netBalance : 0;
        const totalYouOwe = netBalance < 0 ? Math.abs(netBalance) : 0;

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                netBalance: netBalance,
                walletBalance: user.walletBalance || 0,
                totalOwedToYou: totalOwedToYou,
                totalYouOwe: totalYouOwe,
            },
            friendBalances: friendDetails.map(friend => ({
                id: friend._id,
                name: friend.fullName,
                phoneNumber: friend.phoneNumber,
                balance: friend.netBalance || 0
            })),
            stats: {
                totalFriends: friendDetails.length,
                totalOwedToYou,
                totalYouOwe,
                netBalance
            }
        });

    } catch (error) {
        console.error('Dashboard Data Retrieval Error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve dashboard data.',
            error: error.message 
        });
    }
};
