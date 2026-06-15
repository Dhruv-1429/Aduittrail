const mongoose = require('mongoose');
require('dotenv').config();

const AuditLog = require('./models/AuditLog');
const ActivityLog = require('./models/ActivityLog');

const MONGO_URI = process.env.MONGO_ATLAS_URI || 'mongodb://localhost:27017/gateway_db';
const DB_NAME = process.env.MONGO_DB_NAME || 'gateway_db';

const emails = ['admin@auditcore.com', 'user1@example.com', 'test@example.com', 'johndoe@gmail.com', 'meher@bhoyar.com'];

const websiteConfigs = {
    'Flipkart': 0.85,
    'Amazon': 0.92,
    'Instagram': 0.65, // More failed logins
    'Google': 0.98,
    'LeetCode': 0.80,
    'Netflix': 0.95,
    'Twitter': 0.55, // Lots of bot failures
    'LinkedIn': 0.88,
    'Spotify': 0.90,
    'GitHub': 0.97
};
const websites = Object.keys(websiteConfigs);
const ips = ['192.168.1.1', '10.0.0.5', '172.16.0.4', '8.8.8.8', '1.1.1.1', '203.0.113.5', '198.51.100.12'];

function generateRealisticDate(start, end) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    // 75% of traffic happens during peak hours (9 AM - 6 PM)
    const isPeakHour = Math.random() < 0.75;
    let hour;
    if (isPeakHour) {
        hour = 9 + Math.floor(Math.random() * 10); // 9 to 18
    } else {
        hour = Math.floor(Math.random() * 24); // any hour
    }
    
    // Add a slight bell curve effect around 2 PM (14:00)
    if (isPeakHour && Math.random() < 0.3) {
        hour = 13 + Math.floor(Math.random() * 3); // 13, 14, 15
    }
    
    date.setHours(hour);
    
    // Prevent dates from going into the future
    if (date > new Date()) {
        date.setDate(date.getDate() - 1);
    }
    
    return date;
}

async function seedData() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
        console.log(`Connected to MongoDB Atlas (database: ${DB_NAME})`);

        console.log('Clearing existing logs...');
        await AuditLog.deleteMany({});
        await ActivityLog.deleteMany({});

        const auditLogs = [];
        const activityLogs = [];

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        console.log('Generating realistic authentic data...');
        // Generate more data points for better looking graphs
        for (let i = 0; i < 500; i++) {
            const email = emails[Math.floor(Math.random() * emails.length)];
            const website = websites[Math.floor(Math.random() * websites.length)];
            const date = generateRealisticDate(thirtyDaysAgo, now);
            
            // Use website-specific authentic success rates
            const successRate = websiteConfigs[website];
            const isSuccess = Math.random() < successRate;
            const action = isSuccess ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED';

            auditLogs.push({
                userEmail: email,
                action: action,
                websiteName: website,
                details: isSuccess ? 'User logged in successfully' : 'Invalid password or MFA failure',
                ipAddress: ips[Math.floor(Math.random() * ips.length)],
                timestamp: date,
                status: isSuccess ? 'SUCCESS' : 'FAILED',
                errorMessage: isSuccess ? null : 'Authentication failed'
            });

            if (isSuccess) {
                // Add an activity for successful logins
                const actType = Math.random() > 0.5 ? 'PAGE_VIEW' : 'DATA_EXPORT';
                const severity = actType === 'DATA_EXPORT' ? 'MEDIUM' : 'LOW';
                
                activityLogs.push({
                    userEmail: email,
                    activityType: actType,
                    websiteName: website,
                    description: `User performed ${actType} on ${website}`,
                    resourceName: '/dashboard',
                    activityTime: new Date(date.getTime() + Math.floor(Math.random() * 10000)), // up to 10s later
                    durationInSeconds: Math.floor(Math.random() * 300),
                    severity: severity
                });
            }
        }

        // Add some suspicious activity (3+ failed logins) to trigger alerts
        for (let i = 0; i < 4; i++) {
            auditLogs.push({
                userEmail: 'hacker@evil.com',
                action: 'LOGIN_FAILED',
                websiteName: 'Twitter',
                details: 'Brute force attempt detected',
                ipAddress: '10.0.0.99',
                timestamp: new Date(now.getTime() - (i * 60 * 1000)), // Every minute
                status: 'FAILED',
                errorMessage: 'Authentication failed'
            });
        }

        await AuditLog.insertMany(auditLogs);
        await ActivityLog.insertMany(activityLogs);

        console.log(`✅ Seeded ${auditLogs.length} Audit Logs and ${activityLogs.length} Activity Logs successfully!`);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        mongoose.connection.close();
    }
}

seedData();
