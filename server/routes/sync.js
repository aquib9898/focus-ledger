const express = require('express');
const Session = require('../models/Session');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /sync
// Accepts local sessions to push and returns cloud sessions updated after lastSyncedAt
router.post('/', async (req, res) => {
    try {
        const { deviceId, lastSyncedAt, sessions: localSessions } = req.body;
        const userId = req.user.userId;

        // 1. Get cloud sessions updated after lastSyncedAt
        const cloudFilter = { userId };
        if (lastSyncedAt) {
            cloudFilter.updatedAt = { $gt: lastSyncedAt };
        }
        const cloudSessions = await Session.find(cloudFilter).lean();

        const cleanedCloud = cloudSessions.map(s => ({
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

        // 2. Upsert local sessions to cloud (if provided)
        const results = { created: 0, updated: 0, errors: [] };

        if (Array.isArray(localSessions) && localSessions.length > 0) {
            for (const s of localSessions) {
                try {
                    if (!s.id || !s.type || !s.startTime || !s.date) {
                        results.errors.push({ id: s.id, error: 'Missing required fields' });
                        continue;
                    }

                    const existing = await Session.findOne({ userId, id: s.id });

                    if (existing) {
                        if (s.updatedAt > existing.updatedAt) {
                            existing.type = s.type;
                            existing.startTime = s.startTime;
                            existing.endTime = s.endTime;
                            existing.durationSeconds = s.durationSeconds;
                            existing.date = s.date;
                            existing.lastHeartbeat = s.lastHeartbeat;
                            existing.updatedAt = s.updatedAt;
                            existing.deviceId = s.deviceId || deviceId;
                            await existing.save();
                            results.updated++;
                        }
                    } else {
                        await Session.create({
                            id: s.id,
                            userId,
                            type: s.type,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            durationSeconds: s.durationSeconds,
                            date: s.date,
                            lastHeartbeat: s.lastHeartbeat,
                            createdAt: s.createdAt || new Date().toISOString(),
                            updatedAt: s.updatedAt || new Date().toISOString(),
                            deviceId: s.deviceId || deviceId,
                        });
                        results.created++;
                    }
                } catch (sessionErr) {
                    results.errors.push({ id: s.id, error: sessionErr.message });
                }
            }
        }

        // 3. Update user's lastSyncAt and activeDeviceId
        await User.findByIdAndUpdate(userId, {
            lastSyncAt: new Date(),
            activeDeviceId: deviceId || null,
        });

        res.json({
            cloudSessions: cleanedCloud,
            syncResults: results,
            syncedAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Sync error:', err);
        res.status(500).json({ error: 'Sync failed' });
    }
});

module.exports = router;
