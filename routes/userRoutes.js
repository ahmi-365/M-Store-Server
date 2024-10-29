const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

// Middleware to authenticate users
const authenticateUser = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};

// User signup
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Signup error:', error); // Log the error for debugging
        res.status(500).json({ message: 'Internal server error' });
    }
});

// User login

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' }); // Return immediately
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' }); // Return immediately
        }

        // Store user info in session
        req.session.user = { email: user.email };
        return res.json({ message: 'Login successful', userId: user._id, email: user.email }); // Return immediately
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error' }); // Return immediately
    }
});

// Update user data (protected route)
router.put('/update', authenticateUser, async (req, res) => {
    const { email, newData } = req.body; // newData could be any other user data to update

    try {
        const user = await User.findOneAndUpdate({ email }, newData, { new: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user); // Send back the updated user data
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Fetch all users (optional, can be protected)
router.get('/', authenticateUser, async (req, res) => {
    try {
        const users = await User.find({}, 'email');
        res.json(users);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

// Logout user
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

module.exports = router;
