const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authLimiter, sendVerificationEmail, verifyToken } = require('../middleware/security');
const crypto = require('crypto');

// Middleware for role-based access control
const authorize = (roles = []) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            const deviceId = req.headers['x-device-id'];
            const appVersion = req.headers['x-app-version'];

            if (!token || !deviceId || !appVersion) {
                return res.status(401).json({ message: 'Authentication required', details: 'Missing required headers' });
            }

            // Check if token is blacklisted using promisified Redis client
            const isBlacklisted = await redisAsync.get(`blacklist:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({ message: 'Token has been revoked', details: 'Please login again' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            
            // Validate token expiration with a buffer time
            const bufferTime = 300; // 5 minutes in seconds
            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp - bufferTime < currentTime) {
                return res.status(401).json({ 
                    message: 'Token is about to expire',
                    expiresIn: decoded.exp - currentTime
                });
            }

            const user = await User.findById(decoded.userId).select('+isActive +status');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (!user.isActive || user.status !== 'active') {
                return res.status(403).json({ message: 'Account is inactive or suspended' });
            }

            if (roles.length && !roles.includes(user.role)) {
                return res.status(403).json({ message: 'Insufficient permissions' });
            }

            // Validate device and session using promisified Redis client
            const session = await redisAsync.get(`session:${user._id}:${deviceId}`);
            if (!session) {
                return res.status(401).json({ message: 'Invalid session', details: 'Session expired or device not recognized' });
            }

            // Update session expiry
            await redisAsync.setex(`session:${user._id}:${deviceId}`, 24 * 60 * 60, JSON.stringify({
                lastActive: new Date().toISOString(),
                appVersion
            }));

            req.user = user;
            req.deviceId = deviceId;
            req.appVersion = appVersion;
            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Invalid token format', details: error.message });
            } else if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token has expired', details: 'Please login again' });
            }
            console.error('Authentication error:', error);
            res.status(401).json({ message: 'Authentication failed', details: 'An unexpected error occurred' });
        }
    };
};

// Register new user
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, company, address, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            company,
            address,
            role: role || 'customer'
        });

        user.isEmailVerified = false;
        await user.save();
        
        // Send verification email
        await sendVerificationEmail(user);

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

// Verify email
router.get('/verify-email', async (req, res) => {
    try {
        const { token, userId } = req.query;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const storedToken = await redisClient.get(`verify:${userId}`);
        if (!storedToken || storedToken !== token) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        user.isEmailVerified = true;
        await user.save();
        await redisClient.del(`verify:${userId}`);

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying email', error: error.message });
    }
});

// Login user
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !user.isEmailVerified) {
            return res.status(401).json({ message: 'Invalid credentials or email not verified' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
});

// Get current user profile
router.get('/profile', authorize(), async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
});

// Update user profile
router.put('/profile', authorize(), async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password;
        delete updates.role;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
});

module.exports = { router, authorize };