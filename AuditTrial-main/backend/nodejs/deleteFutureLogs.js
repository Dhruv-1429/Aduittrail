require('dotenv').config();
const mongoose = require('mongoose');
const AuditLog = require('./models/AuditLog');
const ActivityLog = require('./models/ActivityLog');

const MONGO_URI = process.env.MONGO_ATLAS_URI;
const DB_NAME = process.env.MONGO_DB_NAME;

async function run() {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    const now = new Date();

    const r1 = await AuditLog.deleteMany({ timestamp: { $gt: now } });
    console.log('Deleted future audit logs:', r1.deletedCount);

    const r2 = await ActivityLog.deleteMany({ activityTime: { $gt: now } });
    console.log('Deleted future activity logs:', r2.deletedCount);

    process.exit(0);
}

run();
