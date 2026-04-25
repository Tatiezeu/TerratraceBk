const Notification = require('../models/Notification');
const User = require('../models/User');

exports.sendUnblockRequest = async (req, res) => {
    try {
        const { plotId, plotCode } = req.body;
        
        const superAdmin = await User.findOne({ role: 'SuperAdmin' });
        if (!superAdmin) {
            return res.status(404).json({ success: false, message: 'SuperAdmin not found' });
        }

        const notification = await Notification.create({
            recipient: superAdmin._id,
            sender: req.user.id,
            type: 'unblock_request',
            title: 'Land Unblock Request',
            message: `Owner ${req.user.firstName} ${req.user.lastName} has requested to unblock land plot: ${plotCode}`,
            relatedPlot: plotId
        });

        res.status(201).json({
            success: true,
            message: 'Unblock request sent to Super Admin',
            data: notification
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .populate('sender', 'firstName lastName');
            
        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMySentNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ sender: req.user.id })
            .sort({ createdAt: -1 })
            .populate('recipient', 'firstName lastName role');
            
        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { status } = req.body;
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { status: status || 'read' },
            { new: true }
        );
        
        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearAll = async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.user.id });
        res.status(200).json({ success: true, message: 'All notifications cleared' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { recipientId, title, message } = req.body;
        const attachments = [];

        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                attachments.push( `/uploads/${file.filename}`);
            });
        }
        
        const notification = await Notification.create({
            recipient: recipientId,
            sender: req.user.id,
            type: 'system',
            title,
            message,
            attachments
        });

        res.status(201).json({
            success: true,
            message: 'Message sent',
            data: notification
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
