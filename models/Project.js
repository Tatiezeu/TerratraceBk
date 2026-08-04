const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    attachments: [{ name: String, url: String, size: String, kind: String }],
}, { timestamps: true, _id: true });

const projectChatSchema = new mongoose.Schema({
    title: { type: String, default: 'New Chat' },
    messages: [chatMessageSchema],
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    instructions: { type: String, default: '', trim: true },
    instructionsList: [{
        text: { type: String, required: true, trim: true },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null means "All"
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    chats: [projectChatSchema],
    files: [{
        name: String,
        size: String,
        kind: { type: String, enum: ['image', 'pdf', 'doc', 'other'] },
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    emoji: { type: String, default: '📁' },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
