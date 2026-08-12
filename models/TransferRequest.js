const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
    plot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LandPlot',
        required: true
    },
    sender: { // Usually the buyer/client initiating the request
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: { // The intended new owner
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notary: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lro: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: [
            'Initiated', 
            'Under_Verification', 
            'Awaiting_Fee_Payment', 
            'Payment_Submitted', 
            'Payment_Verified',
            'Forwarded_to_LRO', 
            'Public_Notice',
            'Completed', 
            'Rejected',
            'Cancelled'
        ],
        default: 'Initiated'
    },
    transferType: {
        type: String,
        enum: ['purchase', 'inheritance', 'direct_grant'],
        required: true
    },
    isSubdivision: {
        type: Boolean,
        default: false
    },
    transferArea: {
        type: Number,
        min: [1, 'Transfer area must be at least 1m2']
    },
    // Client uploaded documents
    clientDocuments: [String],
    
    // Notary uploaded documents
    buyerDocuments: [String],
    certifiedDocuments: [String],
    
    // Payment details
    feeNotice: {
        amount: Number,
        description: String,
        sentAt: Date
    },
    paymentReceipt: String,
    
    // CamPay & Payout details
    campayReference: String,
    campayStatus: String,
    payoutStatus: {
        type: String,
        enum: ['UNRELEASED', 'RELEASED', 'FAILED'],
        default: 'UNRELEASED'
    },
    payoutLog: [{
        recipient: String,
        amount: Number,
        reference: String,
        carrier: String,
        timestamp: { type: Date, default: Date.now }
    }],
    
    notaryFeedback: String,
    lroFeedback: String,
    
    // Public Notice Phase
    publicNotice: {
        startDate: Date,
        endDate: Date,
        isActive: { type: Boolean, default: false }
    },
    objections: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        attachments: [String],
        createdAt: { type: Date, default: Date.now }
    }],

    history: [{
        status: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        comment: String
    }]
}, {
    timestamps: true
});

// ── Performance indexes for fast role-based transfer queries ────────────────
transferRequestSchema.index({ notary: 1, updatedAt: -1 });
transferRequestSchema.index({ lro: 1, updatedAt: -1 });
transferRequestSchema.index({ sender: 1, updatedAt: -1 });
transferRequestSchema.index({ receiver: 1, updatedAt: -1 });
transferRequestSchema.index({ status: 1, updatedAt: -1 });
transferRequestSchema.index({ plot: 1 });

const TransferRequest = mongoose.model('TransferRequest', transferRequestSchema);
module.exports = TransferRequest;
