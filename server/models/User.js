const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 30,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    lastSyncAt: {
        type: Date,
        default: null,
    },
    activeDeviceId: {
        type: String,
        default: null,
    },
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
});

module.exports = mongoose.model('User', userSchema);
