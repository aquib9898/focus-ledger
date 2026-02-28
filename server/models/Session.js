const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['focus', 'waste'],
        required: true,
    },
    startTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
        default: null,
    },
    durationSeconds: {
        type: Number,
        default: null,
    },
    date: {
        type: String,
        required: true,
    },
    lastHeartbeat: {
        type: String,
        default: null,
    },
    createdAt: {
        type: String,
        required: true,
    },
    updatedAt: {
        type: String,
        required: true,
    },
    deviceId: {
        type: String,
        default: null,
    },
}, {
    // Disable Mongoose auto-timestamps — we manage updatedAt manually
    timestamps: false,
});

// Compound unique index: each session id is unique per user
sessionSchema.index({ userId: 1, id: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('Session', sessionSchema);
