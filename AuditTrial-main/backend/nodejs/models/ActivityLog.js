const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true,
        index: true
    },
    activityType: {
        type: String,
        required: true,
        index: true
    },
    websiteName: {
        type: String,
        required: true,
        index: true
    },
    description: {
        type: String,
        default: null
    },
    resourceName: {
        type: String,
        default: null
    },
    activityTime: {
        type: Date,
        default: Date.now,
        index: true
    },
    durationInSeconds: {
        type: Number,
        default: null
    },
    sessionId: {
        type: String,
        default: null
    },
    severity: {
        type: String,
        required: true,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        index: true
    }
}, {
    collection: 'activity_logs',
    timestamps: false
});

// Compound indexes for common query patterns
activityLogSchema.index({ websiteName: 1, activityTime: -1 });

// TTL index — auto-delete logs older than 90 days (7776000 seconds)
activityLogSchema.index({ activityTime: 1 }, { expireAfterSeconds: 7776000 });

// Text index for search
activityLogSchema.index({ userEmail: 'text', activityType: 'text', description: 'text', websiteName: 'text' });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
