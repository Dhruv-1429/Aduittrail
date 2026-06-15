const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true
    },
    websiteName: {
        type: String,
        required: true,
        index: true
    },
    details: {
        type: String,
        default: null
    },
    ipAddress: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    status: {
        type: String,
        required: true,
        enum: ['SUCCESS', 'FAILED'],
        index: true
    },
    errorMessage: {
        type: String,
        default: null
    }
}, {
    collection: 'audit_logs',
    timestamps: false
});

// Compound indexes for common query patterns
auditLogSchema.index({ userEmail: 1, websiteName: 1 });
auditLogSchema.index({ websiteName: 1, timestamp: -1 });

// TTL index — auto-delete logs older than 90 days (7776000 seconds)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Text index for search
auditLogSchema.index({ userEmail: 'text', action: 'text', details: 'text', websiteName: 'text' });

module.exports = mongoose.model('AuditLog', auditLogSchema);
