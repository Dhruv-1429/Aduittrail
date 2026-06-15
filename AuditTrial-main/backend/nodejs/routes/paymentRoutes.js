const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

// ===================== POST — Create Payment =====================

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        
        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const payment = new Payment({
            userEmail: req.user.email,
            amount,
            currency: currency || 'USD',
            status: 'COMPLETED', // Mocking a successful payment
            transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase()
        });

        const saved = await payment.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error('Error creating payment:', err.message);
        res.status(500).json({ error: 'Failed to create payment', details: err.message });
    }
});

// ===================== GET — User Payment History =====================

router.get('/user-history/:email', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' && req.user.email !== req.params.email) {
            return res.status(403).json({ error: 'Forbidden: Cannot access other users payments' });
        }
        const { email } = req.params;
        const payments = await Payment.find({ userEmail: email }).sort({ paymentDate: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== GET — All Payments (Admin) =====================

router.get('/search', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        let query = {};
        if (req.query.userEmail) query.userEmail = new RegExp(req.query.userEmail, 'i');
        if (req.query.transactionId) query.transactionId = req.query.transactionId;

        const [payments, total] = await Promise.all([
            Payment.find(query).sort({ paymentDate: -1 }).skip(skip).limit(limit),
            Payment.countDocuments(query)
        ]);

        res.json({
            code: 200,
            totalPayments: total,
            page,
            totalPages: Math.ceil(total / limit),
            payments
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== GET — Recent Payments (Admin Dashboard) =====================

router.get('/recent', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const payments = await Payment.find().sort({ paymentDate: -1 }).limit(10);
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
