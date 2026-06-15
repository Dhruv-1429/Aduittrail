const mongoose = require('mongoose');
require('dotenv').config();

const AuditLog = require('./models/AuditLog');
const ActivityLog = require('./models/ActivityLog');

const MONGO_URI = process.env.MONGO_ATLAS_URI || 'mongodb://localhost:27017/gateway_db';
const DB_NAME = process.env.MONGO_DB_NAME || 'gateway_db';

async function clearData() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
        console.log(`Connected to MongoDB Atlas (database: ${DB_NAME})`);

        console.log('Clearing ALL logs...');
        await AuditLog.deleteMany({});
        await ActivityLog.deleteMany({});
        
        console.log('✅ Successfully cleared all fake data. The database is now empty and ready for authentic logs.');
    } catch (err) {
        console.error('❌ Clearing failed:', err);
    } finally {
        mongoose.connection.close();
    }
}

clearData();
