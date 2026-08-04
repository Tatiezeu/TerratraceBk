const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const EMOJI_LIST = ['📁', '🏠', '🌾', '🏢', '🎓', '🏥', '⚽', '🌳', '🏨', '💡', '🚛', '🏦', '🌍', '🔬', '☀️'];

// ── Project CRUD ─────────────────────────────────────────────────────────────

exports.createProject = async (req, res) => {
    try {
        const { name, description, instructions, emoji } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Project name is required.' });

        const project = await Project.create({
            name, description, instructions,
            owner: req.user._id || req.user.id,
            emoji: emoji || EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)],
            chats: [{ title: 'Main Chat', messages: [] }],
        });

        await project.populate('owner', 'firstName lastName email profilePic');
        res.status(201).json({ success: true, data: project });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyProjects = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const projects = await Project.find({
            $or: [{ owner: userId }, { collaborators: userId }]
        })
            .populate('owner', 'firstName lastName email profilePic')
            .populate('collaborators', 'firstName lastName email profilePic')
            .select('-chats.messages') // exclude heavy message content from list
            .sort({ updatedAt: -1 })
            .lean();

        res.status(200).json({ success: true, data: projects });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        })
            .populate('owner', 'firstName lastName email profilePic')
            .populate('collaborators', 'firstName lastName email profilePic')
            .populate('instructionsList.createdBy', 'firstName lastName email')
            .populate('instructionsList.assignedTo', 'firstName lastName email');

        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
        res.status(200).json({ success: true, data: project });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id || req.user.id;
        const { name, description, instructions, emoji } = req.body;

        const project = await Project.findOneAndUpdate(
            { _id: id, owner: userId },
            { name, description, instructions, emoji },
            { new: true }
        )
            .populate('owner', 'firstName lastName email profilePic')
            .populate('collaborators', 'firstName lastName email profilePic');

        if (!project) return res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        res.status(200).json({ success: true, data: project });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id || req.user.id;
        const project = await Project.findOneAndDelete({ _id: id, owner: userId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found or access denied.' });
        res.status(200).json({ success: true, message: 'Project deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Collaborators ─────────────────────────────────────────────────────────────

exports.addCollaborator = async (req, res) => {
    try {
        const { id } = req.params;
        const { collaboratorId } = req.body;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({ _id: id, owner: userId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found or access denied.' });

        if (collaboratorId === userId.toString())
            return res.status(400).json({ success: false, message: 'You cannot add yourself as a collaborator.' });

        const alreadyAdded = project.collaborators.some(c => c.toString() === collaboratorId);
        if (alreadyAdded)
            return res.status(400).json({ success: false, message: 'User is already a collaborator.' });

        project.collaborators.push(collaboratorId);
        await project.save();

        // Notify the collaborator
        await Notification.create({
            recipient: collaboratorId,
            sender: userId,
            type: 'system',
            title: `Added to Project: ${project.name}`,
            message: `${req.user.firstName} ${req.user.lastName} has added you as a collaborator on the project "${project.name}". You can now access and chat within this project.`,
        });

        await project.populate('collaborators', 'firstName lastName email profilePic');
        res.status(200).json({ success: true, data: project.collaborators });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.removeCollaborator = async (req, res) => {
    try {
        const { id, collaboratorId } = req.params;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({ _id: id, owner: userId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found or access denied.' });

        project.collaborators = project.collaborators.filter(c => c.toString() !== collaboratorId);
        await project.save();
        res.status(200).json({ success: true, message: 'Collaborator removed.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Search available collaborators (Client / Landowner only)
exports.searchCollaborators = async (req, res) => {
    try {
        const { q } = req.query;
        const userId = req.user._id || req.user.id;

        const filter = {
            _id: { $ne: userId },
            role: { $in: ['Client', 'Landowner'] },
        };

        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), 'i');
            filter.$or = [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
            ];
        }

        const users = await User.find(filter)
            .select('firstName lastName email profilePic role')
            .limit(15)
            .lean();

        res.status(200).json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Project Chats ─────────────────────────────────────────────────────────────

exports.createProjectChat = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        project.chats.push({ title: title || 'New Chat', messages: [] });
        await project.save();

        const newChat = project.chats[project.chats.length - 1];
        res.status(201).json({ success: true, data: newChat });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteProjectChat = async (req, res) => {
    try {
        const { id, chatId } = req.params;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        project.chats = project.chats.filter(c => c._id.toString() !== chatId);
        await project.save();
        res.status(200).json({ success: true, message: 'Chat deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.renameProjectChat = async (req, res) => {
    try {
        const { id, chatId } = req.params;
        const { title } = req.body;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        const chat = project.chats.id(chatId);
        if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

        chat.title = title || chat.title;
        await project.save();

        res.status(200).json({ success: true, data: chat });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addProjectChatMessage = async (req, res) => {
    try {
        const { id, chatId } = req.params;
        const { role, content } = req.body;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        const chat = project.chats.id(chatId);
        if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

        chat.messages.push({ role, content });
        await project.save();

        const msg = chat.messages[chat.messages.length - 1];
        res.status(201).json({ success: true, data: msg });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProjectChat = async (req, res) => {
    try {
        const { id, chatId } = req.params;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        const chat = project.chats.id(chatId);
        if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

        res.status(200).json({ success: true, data: chat });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Collaborative Instructions ───────────────────────────────────────────────

exports.addInstruction = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, assignedTo } = req.body;
        const userId = req.user._id || req.user.id;

        if (!text) return res.status(400).json({ success: false, message: 'Instruction text is required.' });

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        project.instructionsList.push({
            text,
            assignedTo: assignedTo || null,
            createdBy: userId
        });

        await project.save();

        // Send Notification if assigned to a collaborator
        if (assignedTo && assignedTo !== userId.toString()) {
            await Notification.create({
                recipient: assignedTo,
                sender: userId,
                type: 'system',
                title: `Assigned Instruction: ${project.name}`,
                message: `${req.user.firstName} ${req.user.lastName} assigned you an instruction in project "${project.name}":\n\n"${text}"`,
            });
        }

        await project.populate('instructionsList.createdBy', 'firstName lastName email');
        await project.populate('instructionsList.assignedTo', 'firstName lastName email');

        res.status(201).json({ success: true, data: project.instructionsList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteInstruction = async (req, res) => {
    try {
        const { id, instructionId } = req.params;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        project.instructionsList = project.instructionsList.filter(ins => ins._id.toString() !== instructionId);
        await project.save();

        res.status(200).json({ success: true, message: 'Instruction deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Direct Messages (DMs) ───────────────────────────────────────────────────

exports.getDirectMessages = async (req, res) => {
    try {
        const { id, userId: targetUserId } = req.params;
        const currentUserId = req.user._id || req.user.id;
        const DirectMessage = require('../models/DirectMessage');

        // Verify requester is part of the project
        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: currentUserId }, { collaborators: currentUserId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        // Mark incoming DMs as read
        await DirectMessage.updateMany(
            { project: id, sender: targetUserId, recipient: currentUserId, read: false },
            { $set: { read: true } }
        );

        const messages = await DirectMessage.find({
            project: id,
            $or: [
                { sender: currentUserId, recipient: targetUserId },
                { sender: targetUserId, recipient: currentUserId }
            ]
        })
            .populate('sender', 'firstName lastName profilePic')
            .populate('recipient', 'firstName lastName profilePic')
            .sort({ createdAt: 1 })
            .lean();

        res.status(200).json({ success: true, data: messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendDirectMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { recipientId, content } = req.body;
        const currentUserId = req.user._id || req.user.id;
        const DirectMessage = require('../models/DirectMessage');

        if (!content) return res.status(400).json({ success: false, message: 'Content is required.' });

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: currentUserId }, { collaborators: currentUserId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        const msg = await DirectMessage.create({
            project: id,
            sender: currentUserId,
            recipient: recipientId,
            content
        });

        await msg.populate('sender', 'firstName lastName profilePic');
        await msg.populate('recipient', 'firstName lastName profilePic');

        res.status(201).json({ success: true, data: msg });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearDirectMessages = async (req, res) => {
    try {
        const { id, userId: targetUserId } = req.params;
        const currentUserId = req.user._id || req.user.id;
        const DirectMessage = require('../models/DirectMessage');

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: currentUserId }, { collaborators: currentUserId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        await DirectMessage.deleteMany({
            project: id,
            $or: [
                { sender: currentUserId, recipient: targetUserId },
                { sender: targetUserId, recipient: currentUserId }
            ]
        });

        res.status(200).json({ success: true, message: 'Chat history cleared successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getUnreadDMCounts = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id || req.user.id;
        const DirectMessage = require('../models/DirectMessage');
        const mongoose = require('mongoose');

        const unreads = await DirectMessage.aggregate([
            {
                $match: {
                    project: new mongoose.Types.ObjectId(id),
                    recipient: new mongoose.Types.ObjectId(currentUserId),
                    read: false
                }
            },
            { $group: { _id: '$sender', count: { $sum: 1 } } }
        ]);

        const countMap = {};
        unreads.forEach(u => {
            countMap[u._id.toString()] = u.count;
        });

        res.status(200).json({ success: true, data: countMap });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Project Files ────────────────────────────────────────────────────────────

exports.addProjectFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, size, kind, url } = req.body;
        const userId = req.user._id || req.user.id;

        if (!name) return res.status(400).json({ success: false, message: 'File name is required.' });

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        project.files.push({
            name,
            size: size || '0 KB',
            kind: kind || 'other',
            url: url || '',
            uploadedAt: new Date()
        });

        await project.save();
        res.status(201).json({ success: true, data: project.files });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteProjectFile = async (req, res) => {
    try {
        const { id, fileId } = req.params;
        const userId = req.user._id || req.user.id;

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: userId }, { collaborators: userId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        project.files = project.files.filter(f => f._id.toString() !== fileId && f.id !== fileId);
        await project.save();

        res.status(200).json({ success: true, message: 'File deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Project Group Messages ───────────────────────────────────────────────────

exports.getGroupMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id || req.user.id;
        const GroupMessage = require('../models/GroupMessage');

        // Verify requester is part of the project
        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: currentUserId }, { collaborators: currentUserId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        const messages = await GroupMessage.find({ project: id })
            .populate('sender', 'firstName lastName profilePic')
            .sort({ createdAt: 1 })
            .lean();

        res.status(200).json({ success: true, data: messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendGroupMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const currentUserId = req.user._id || req.user.id;
        const GroupMessage = require('../models/GroupMessage');

        if (!content) return res.status(400).json({ success: false, message: 'Content is required.' });

        const project = await Project.findOne({
            _id: id,
            $or: [{ owner: currentUserId }, { collaborators: currentUserId }]
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

        const msg = await GroupMessage.create({
            project: id,
            sender: currentUserId,
            content
        });

        await msg.populate('sender', 'firstName lastName profilePic');

        res.status(201).json({ success: true, data: msg });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearGroupMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id || req.user.id;
        const GroupMessage = require('../models/GroupMessage');

        // Only project owner can clear group messages
        const project = await Project.findOne({ _id: id, owner: currentUserId });
        if (!project) return res.status(403).json({ success: false, message: 'Only the project owner can clear group chat history.' });

        await GroupMessage.deleteMany({ project: id });
        res.status(200).json({ success: true, message: 'Group chat history cleared successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



