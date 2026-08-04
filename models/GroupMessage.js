const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
