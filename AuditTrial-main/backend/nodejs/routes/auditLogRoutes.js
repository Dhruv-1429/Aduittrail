const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

// ===================== POST — Create Audit Log =====================

router.post('/logs', async (req, res) => {
    try {
        const { userEmail, action, websiteName, details, ipAddress, status, errorMessage } = req.body;

        if (!userEmail || !action || !websiteName || !ipAddress || !status) {
            return res.status(400).json({ error: 'Missing required fields: userEmail, action, websiteName, ipAddress, status' });
        }

        const auditLog = new AuditLog({
            userEmail,
            action,
            websiteName,
            details: details || null,
            ipAddress,
            timestamp: new Date(),
            status,
            errorMessage: errorMessage || null
        });

        const saved = await auditLog.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error('Error creating audit log:', err.message);
        res.status(500).json({ error: 'Failed to create audit log', details: err.message });
    }
});

// ===================== GET — Query Audit Logs (with pagination & search) =====================

// Helper: build pagination and search
function buildPaginationAndSearch(query, reqQuery) {
    const page = parseInt(reqQuery.page) || 1;
    const limit = parseInt(reqQuery.limit) || 50;
    const skip = (page - 1) * limit;
    const search = reqQuery.search;

    let filter = { ...query };
    if (search) {
        filter.$text = { $search: search };
    }

    return { filter, skip, limit, page };
}

// Unified search
router.get('/logs/search', async (req, res) => {
    try {
        const { websiteName, userEmail, status, action, startDate, endDate } = req.query;
        
        let query = {};
        if (websiteName) query.websiteName = websiteName;
        if (userEmail) query.userEmail = userEmail;
        if (status) query.status = status;
        if (action) query.action = action;
        
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const { filter, skip, limit, page } = buildPaginationAndSearch(query, req.query);
        const [logs, total] = await Promise.all([
            AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter)
        ]);
        
        res.json({
            code: 200,
            totalRecords: total,
            page,
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// By website
router.get('/logs/website', async (req, res) => {
    try {
        const { websiteName } = req.query;
        if (!websiteName) return res.status(400).json({ error: 'websiteName is required' });

        const { filter, skip, limit, page } = buildPaginationAndSearch({ websiteName }, req.query);
        const [logs, total] = await Promise.all([
            AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            websiteName,
            totalRecords: total,
            page,
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// By user email
router.get('/logs/user', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { userEmail } = req.query;
        if (!userEmail) return res.status(400).json({ error: 'userEmail is required' });

        const { filter, skip, limit, page } = buildPaginationAndSearch({ userEmail }, req.query);
        const [logs, total] = await Promise.all([
            AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            userEmail,
            totalRecords: total,
            page,
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// By date range
router.get('/logs/daterange', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { websiteName, startTime, endTime } = req.query;
        if (!websiteName || !startTime || !endTime) {
            return res.status(400).json({ error: 'websiteName, startTime, and endTime are required' });
        }

        const baseQuery = {
            websiteName,
            timestamp: {
                $gte: new Date(startTime),
                $lte: new Date(endTime)
            }
        };
        const { filter, skip, limit, page } = buildPaginationAndSearch(baseQuery, req.query);
        const [logs, total] = await Promise.all([
            AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter)
        ]);

        res.json({
            code: 200,
            websiteName,
            startTime,
            endTime,
            totalRecords: total,
            page,
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Failed audits
router.get('/logs/failed', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { filter, skip, limit, page } = buildPaginationAndSearch({ status: 'FAILED' }, req.query);
        const [logs, total] = await Promise.all([
            AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            totalFailedRecords: total,
            page,
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// By user and website
router.get('/logs/user-website', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { userEmail, websiteName } = req.query;
        if (!userEmail || !websiteName) {
            return res.status(400).json({ error: 'userEmail and websiteName are required' });
        }

        const { filter, skip, limit, page } = buildPaginationAndSearch({ userEmail, websiteName }, req.query);
        const [logs, total] = await Promise.all([
            AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            userEmail,
            websiteName,
            totalRecords: total,
            page,
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== User History (all logs for a specific user) =====================

router.get('/logs/user-history/:email', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' && req.user.email !== req.params.email) {
            return res.status(403).json({ error: 'Forbidden: Cannot access other users logs' });
        }
        const { email } = req.params;
        const { filter, skip, limit, page } = buildPaginationAndSearch({ userEmail: email }, req.query);
        const [logs, total] = await Promise.all([
            AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            userEmail: email,
            totalRecords: total,
            page,
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== Dashboard Support Endpoints =====================

// Stats for dashboard
router.get('/logs/stats', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const [totalAuditLogs, failedCount, successCount] = await Promise.all([
            AuditLog.countDocuments(),
            AuditLog.countDocuments({ status: 'FAILED' }),
            AuditLog.countDocuments({ status: 'SUCCESS' })
        ]);

        res.json({
            totalAuditLogs,
            failedCount,
            successCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Recent audit logs (top 20)
router.get('/logs/recent', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(20);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== TIME SERIES — Daily audit counts =====================

router.get('/logs/timeseries', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const pipeline = [
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' },
                        day: { $dayOfMonth: '$timestamp' }
                    },
                    total: { $sum: 1 },
                    success: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
                    failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateFromParts: {
                            year: '$_id.year',
                            month: '$_id.month',
                            day: '$_id.day'
                        }
                    },
                    total: 1,
                    success: 1,
                    failed: 1
                }
            }
        ];

        const data = await AuditLog.aggregate(pipeline);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== SUSPICIOUS ACTIVITY — Users with 3+ failed logins in last 5 min =====================

router.get('/logs/suspicious', async (req, res) => {
    try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const thresholdMinutes = parseInt(req.query.minutes) || 60;
        const threshold = parseInt(req.query.threshold) || 3;
        const windowStart = new Date(Date.now() - thresholdMinutes * 60 * 1000);

        const pipeline = [
            {
                $match: {
                    status: 'FAILED',
                    timestamp: { $gte: windowStart }
                }
            },
            {
                $group: {
                    _id: '$userEmail',
                    failedCount: { $sum: 1 },
                    lastAttempt: { $max: '$timestamp' },
                    websites: { $addToSet: '$websiteName' },
                    actions: { $addToSet: '$action' }
                }
            },
            { $match: { failedCount: { $gte: threshold } } },
            { $sort: { failedCount: -1 } },
            {
                $project: {
                    _id: 0,
                    userEmail: '$_id',
                    failedCount: 1,
                    lastAttempt: 1,
                    websites: 1,
                    actions: 1
                }
            }
        ];

        const suspicious = await AuditLog.aggregate(pipeline);
        res.json({
            windowMinutes: thresholdMinutes,
            threshold,
            totalSuspicious: suspicious.length,
            alerts: suspicious
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== AGGREGATIONS — Top users, peak hours, failure rate =====================

router.get('/logs/aggregations', async (req, res) => {
    try {
        // Top 5 most active users
        const topUsersPipeline = [
            { $group: { _id: '$userEmail', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, userEmail: '$_id', count: 1 } }
        ];

        // Peak login hours (24-hour distribution)
        const peakHoursPipeline = [
            {
                $group: {
                    _id: { $hour: '$timestamp' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, hour: '$_id', count: 1 } }
        ];

        // Failure rate by website
        const failureRatePipeline = [
            {
                $group: {
                    _id: '$websiteName',
                    total: { $sum: 1 },
                    failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
                    success: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    websiteName: '$_id',
                    total: 1,
                    failed: 1,
                    success: 1,
                    failureRate: {
                        $cond: [
                            { $eq: ['$total', 0] },
                            0,
                            { $multiply: [{ $divide: ['$failed', '$total'] }, 100] }
                        ]
                    }
                }
            },
            { $sort: { failureRate: -1 } }
        ];

        const [topUsers, peakHours, failureRate] = await Promise.all([
            AuditLog.aggregate(topUsersPipeline),
            AuditLog.aggregate(peakHoursPipeline),
            AuditLog.aggregate(failureRatePipeline)
        ]);

        res.json({
            topUsers,
            peakHours,
            failureRateByWebsite: failureRate
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
