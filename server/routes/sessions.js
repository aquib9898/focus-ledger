const express = require('express');
const Session = require('../models/Session');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /sessions?updatedAfter=<ISO timestamp>
router.get('/', async (req, res) => {
    try {
        const { updatedAfter } = req.query;
        const filter = { userId: req.user.userId };

        if (updatedAfter) {
            filter.updatedAt = { $gt: updatedAfter };
        }

        const sessions = await Session.find(filter).lean();

        // Strip MongoDB internals, return clean objects
        const cleaned = sessions.map(s => ({
            id: s.id,
            type: s.type,
            startTime: s.startTime,
            endTime: s.endTime,
            durationSeconds: s.durationSeconds,
            date: s.date,
            lastHeartbeat: s.lastHeartbeat,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            deviceId: s.deviceId,
        }));

        res.json({ sessions: cleaned });
    } catch (err) {
        console.error('Get sessions error:', err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// POST /sessions/bulk — upsert multiple sessions
router.post('/bulk', async (req, res) => {
    try {
        const { sessions } = req.body;

        if (!Array.isArray(sessions) || sessions.length === 0) {
            return res.status(400).json({ error: 'sessions array is required' });
        }

        const results = { created: 0, updated: 0, errors: [] };

        for (const s of sessions) {
            try {
                // Validate required fields
                if (!s.id || !s.type || !s.startTime || !s.date) {
                    results.errors.push({ id: s.id, error: 'Missing required fields' });
                    continue;
                }
                if (s.type !== 'focus' && s.type !== 'waste') {
                    results.errors.push({ id: s.id, error: 'Invalid session type' });
                    continue;
                }

                const existing = await Session.findOne({ userId: req.user.userId, id: s.id });

                if (existing) {
                    // Update only if incoming is newer
                    if (s.updatedAt > existing.updatedAt) {
                        existing.type = s.type;
                        existing.startTime = s.startTime;
                        existing.endTime = s.endTime;
                        existing.durationSeconds = s.durationSeconds;
                        existing.date = s.date;
                        existing.lastHeartbeat = s.lastHeartbeat;
                        existing.updatedAt = s.updatedAt;
                        existing.deviceId = s.deviceId;
                        await existing.save();
                        results.updated++;
                    }
                } else {
                    await Session.create({
                        id: s.id,
                        userId: req.user.userId,
                        type: s.type,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        durationSeconds: s.durationSeconds,
                        date: s.date,
                        lastHeartbeat: s.lastHeartbeat,
                        createdAt: s.createdAt || new Date().toISOString(),
                        updatedAt: s.updatedAt || new Date().toISOString(),
                        deviceId: s.deviceId,
                    });
                    results.created++;
                }
            } catch (sessionErr) {
                results.errors.push({ id: s.id, error: sessionErr.message });
            }
        }

        res.json(results);
    } catch (err) {
        console.error('Bulk sessions error:', err);
        res.status(500).json({ error: 'Failed to process sessions' });
    }
});

// PUT /sessions/:id — update a single session
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body;

        const session = await Session.findOne({ userId: req.user.userId, id });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Only update allowed fields
        const allowedFields = ['type', 'startTime', 'endTime', 'durationSeconds', 'date', 'lastHeartbeat', 'updatedAt', 'deviceId'];
        for (const field of allowedFields) {
            if (update[field] !== undefined) {
                session[field] = update[field];
            }
        }

        await session.save();

        res.json({
            id: session.id,
            type: session.type,
            startTime: session.startTime,
            endTime: session.endTime,
            durationSeconds: session.durationSeconds,
            date: session.date,
            lastHeartbeat: session.lastHeartbeat,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            deviceId: session.deviceId,
        });
    } catch (err) {
        console.error('Update session error:', err);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// DELETE /sessions/:id — delete a single session
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Session.deleteOne({ userId: req.user.userId, id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Delete session error:', err);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

module.exports = router;
