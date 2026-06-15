const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

// ===================== POST — Create Activity Log =====================

router.post('/logs', async (req, res) => {
    try {
        const { userEmail, activityType, websiteName, description, resourceName,
                durationInSeconds, sessionId, severity } = req.body;

        if (!userEmail || !activityType || !websiteName || !severity) {
            return res.status(400).json({ error: 'Missing required fields: userEmail, activityType, websiteName, severity' });
        }

        const activityLog = new ActivityLog({
            userEmail,
            activityType,
            websiteName,
            description: description || null,
            resourceName: resourceName || null,
            activityTime: new Date(),
            durationInSeconds: durationInSeconds || null,
            sessionId: sessionId || null,
            severity
        });

        const saved = await activityLog.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error('Error creating activity log:', err.message);
        res.status(500).json({ error: 'Failed to create activity log', details: err.message });
    }
});

// ===================== Pagination & Search Helper =====================

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

// ===================== GET — Query Activity Logs =====================

// Unified search
router.get('/logs/search', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { websiteName, userEmail, activityType, severity, startDate, endDate } = req.query;
        
        let query = {};
        if (websiteName) query.websiteName = websiteName;
        if (userEmail) query.userEmail = userEmail;
        if (activityType) query.activityType = activityType;
        if (severity) query.severity = severity;
        
        if (startDate || endDate) {
            query.activityTime = {};
            if (startDate) query.activityTime.$gte = new Date(startDate);
            if (endDate) query.activityTime.$lte = new Date(endDate);
        }

        const { filter, skip, limit, page } = buildPaginationAndSearch(query, req.query);
        const [logs, total] = await Promise.all([
            ActivityLog.find(filter).sort({ activityTime: -1 }).skip(skip).limit(limit),
            ActivityLog.countDocuments(filter)
        ]);
        
        res.json({
            code: 200,
            totalActivities: total,
            page,
            totalPages: Math.ceil(total / limit),
            activities: logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// By website
router.get('/logs/website', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { websiteName } = req.query;
        if (!websiteName) return res.status(400).json({ error: 'websiteName is required' });

        const { filter, skip, limit, page } = buildPaginationAndSearch({ websiteName }, req.query);
        const [logs, total] = await Promise.all([
            ActivityLog.find(filter).sort({ activityTime: -1 }).skip(skip).limit(limit),
            ActivityLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            websiteName,
            totalActivities: total,
            page,
            totalPages: Math.ceil(total / limit),
            activities: logs
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
            ActivityLog.find(filter).sort({ activityTime: -1 }).skip(skip).limit(limit),
            ActivityLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            userEmail,
            totalActivities: total,
            page,
            totalPages: Math.ceil(total / limit),
            activities: logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// By activity type
router.get('/logs/type', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { activityType } = req.query;
        if (!activityType) return res.status(400).json({ error: 'activityType is required' });

        const { filter, skip, limit, page } = buildPaginationAndSearch({ activityType }, req.query);
        const [logs, total] = await Promise.all([
            ActivityLog.find(filter).sort({ activityTime: -1 }).skip(skip).limit(limit),
            ActivityLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            activityType,
            totalActivities: total,
            page,
            totalPages: Math.ceil(total / limit),
            activities: logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// By severity
router.get('/logs/severity', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { severity } = req.query;
        if (!severity) return res.status(400).json({ error: 'severity is required' });

        const { filter, skip, limit, page } = buildPaginationAndSearch({ severity }, req.query);
        const [logs, total] = await Promise.all([
            ActivityLog.find(filter).sort({ activityTime: -1 }).skip(skip).limit(limit),
            ActivityLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            severity,
            totalActivities: total,
            page,
            totalPages: Math.ceil(total / limit),
            activities: logs
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
            activityTime: {
                $gte: new Date(startTime),
                $lte: new Date(endTime)
            }
        };
        const { filter, skip, limit, page } = buildPaginationAndSearch(baseQuery, req.query);
        const [logs, total] = await Promise.all([
            ActivityLog.find(filter).sort({ activityTime: -1 }).skip(skip).limit(limit),
            ActivityLog.countDocuments(filter)
        ]);

        res.json({
            code: 200,
            websiteName,
            startTime,
            endTime,
            totalActivities: total,
            page,
            totalPages: Math.ceil(total / limit),
            activities: logs
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
            ActivityLog.find(filter).sort({ activityTime: -1 }).skip(skip).limit(limit),
            ActivityLog.countDocuments(filter)
        ]);
        res.json({
            code: 200,
            userEmail: email,
            totalActivities: total,
            page,
            totalPages: Math.ceil(total / limit),
            activities: logs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== Dashboard Support Endpoints =====================

// Stats for dashboard
router.get('/logs/stats', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const [totalActivityLogs, loginCount, registrationCount] = await Promise.all([
            ActivityLog.countDocuments(),
            ActivityLog.countDocuments({ activityType: 'LOGIN' }),
            ActivityLog.countDocuments({ activityType: 'REGISTRATION' })
        ]);

        res.json({
            totalActivityLogs,
            loginCount,
            registrationCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Recent activity logs (top 20)
router.get('/logs/recent', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const logs = await ActivityLog.find().sort({ activityTime: -1 }).limit(20);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== TIME SERIES — Daily activity counts =====================

router.get('/logs/timeseries', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const pipeline = [
            { $match: { activityTime: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$activityTime' },
                        month: { $month: '$activityTime' },
                        day: { $dayOfMonth: '$activityTime' }
                    },
                    total: { $sum: 1 },
                    logins: { $sum: { $cond: [{ $eq: ['$activityType', 'LOGIN'] }, 1, 0] } },
                    registrations: { $sum: { $cond: [{ $eq: ['$activityType', 'REGISTRATION'] }, 1, 0] } }
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
                    logins: 1,
                    registrations: 1
                }
            }
        ];

        const data = await ActivityLog.aggregate(pipeline);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== AGGREGATIONS — Top activity types, busiest hours, severity distribution =====================

router.get('/logs/aggregations', authMiddleware, requireAdmin, async (req, res) => {
    try {
        // Activity type distribution
        const typePipeline = [
            { $group: { _id: '$activityType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, activityType: '$_id', count: 1 } }
        ];

        // Busiest hours (24-hour distribution)
        const hoursPipeline = [
            {
                $group: {
                    _id: { $hour: '$activityTime' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, hour: '$_id', count: 1 } }
        ];

        // Severity distribution
        const severityPipeline = [
            { $group: { _id: '$severity', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, severity: '$_id', count: 1 } }
        ];

        // Top 5 active users
        const topUsersPipeline = [
            { $group: { _id: '$userEmail', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, userEmail: '$_id', count: 1 } }
        ];

        const [typeDistribution, busiestHours, severityDistribution, topUsers] = await Promise.all([
            ActivityLog.aggregate(typePipeline),
            ActivityLog.aggregate(hoursPipeline),
            ActivityLog.aggregate(severityPipeline),
            ActivityLog.aggregate(topUsersPipeline)
        ]);

        res.json({
            typeDistribution,
            busiestHours,
            severityDistribution,
            topUsers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
