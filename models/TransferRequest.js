const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
    plot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LandPlot',
        required: true
    },
    sender: { // Current owner initiating transfer or buyer initiating purchase
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: { // Intended new owner
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notary: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // User with role 'Notary'
    },
    lro: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // User with role 'LRO'
    },
    status: {
        type: String,
        enum: ['Initiated', 'Notary_Review', 'LRO_Review', 'Awaiting_Payment', 'Completed', 'Rejected'],
        default: 'Initiated'
    },
    transferType: {
        type: String,
        enum: ['purchase', 'inheritance'],
        required: true
    },
    documents: [{
        name: String,
        url: String,
        type: {
            type: String,
            enum: ['CNI', 'Deed_of_Sale', 'Inheritance_Certificate', 'Other']
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    notaryFeedback: String,
    lroFeedback: String,
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
