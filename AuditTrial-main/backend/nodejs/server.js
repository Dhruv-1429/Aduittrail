const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const auditLogRoutes = require('./routes/auditLogRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ===================== Middleware =====================
app.use(cors());
app.use(express.json());

// ===================== Routes =====================
app.use('/api/audit', auditLogRoutes); L
app.use('/api/activity', activityLogRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        service: 'AuditCore Log Service (Node.js)',
        status: 'UP',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
    });
});

// ===================== MongoDB Connection & Server Start =====================
const MONGO_URI = process.env.MONGO_ATLAS_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'gateway_db';

mongoose.connect(MONGO_URI, {
    dbName: DB_NAME,
})
    .then(() => {
        console.log(`✅ Connected to MongoDB Atlas (database: ${DB_NAME})`);
        app.listen(PORT, () => {
            console.log(`🚀 Node.js Log Service running on http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/health`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });
