const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    userId: {
        type: String,
        default: 'anonymous'
    },
    userName: {
        type: String,
        default: 'Anonymous User'
    },
    userRole: {
        type: String,
        default: 'Guest'
    },
    action_type: {
        type: String,
        required: true,
        enum: ['Auth', 'Create', 'Read', 'Update', 'Delete']
    },
    description: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ip: {
        type: String,
        default: '192.168.1.105'
    },
    success: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

logSchema.index({ timestamp: -1 });
logSchema.index({ action_type: 1 });

const Log = mongoose.model('Log', logSchema);
module.exports = Log;
