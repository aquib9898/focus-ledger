const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        if (typeof username !== 'string' || username.trim().length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check uniqueness
        const existing = await User.findOne({ username: username.trim().toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash & create
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await User.create({
            username: username.trim().toLowerCase(),
            passwordHash,
        });

        // Generate token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username: username.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;
