require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/sync', syncRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Focus server running on port ${PORT}`);
    });
}

start();
