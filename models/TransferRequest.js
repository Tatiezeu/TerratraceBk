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
        ref: 'User',
        required: true
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
            'Rejected'
        ],
        default: 'Initiated'
    },
    transferType: {
        type: String,
        enum: ['purchase', 'inheritance', 'direct_grant'],
        required: true
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

const TransferRequest = mongoose.model('TransferRequest', transferRequestSchema);
module.exports = TransferRequest;
