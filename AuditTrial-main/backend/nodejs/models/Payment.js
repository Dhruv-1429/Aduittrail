const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'COMPLETED'
    },
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    paymentDate: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Text index for search
paymentSchema.index({ userEmail: 'text', transactionId: 'text' });

module.exports = mongoose.model('Payment', paymentSchema);
