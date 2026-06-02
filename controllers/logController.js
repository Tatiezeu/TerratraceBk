const Log = require('../models/Log');

const seedLogs = [
  {
    userId: '654321098765432109876541',
    userName: 'Marie Kouadio',
    userRole: 'Super Admin',
    action_type: 'Auth',
    description: 'Login Successful',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    ip: '197.234.1.42',
    success: true
  },
  {
    userId: '654321098765432109876542',
    userName: 'Jean Dupont',
    userRole: 'Notary',
    action_type: 'Update',
    description: 'Password Reset',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    ip: '197.234.1.88',
    success: true
  },
  {
    userId: 'anonymous',
    userName: 'Anonymous User',
    userRole: 'Guest',
    action_type: 'Auth',
    description: 'Login Failed (Attempt 1)',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    ip: '203.0.113.5',
    success: false
  },
  {
    userId: '654321098765432109876543',
    userName: 'Alice Beka',
    userRole: 'Landowner',
    action_type: 'Update',
    description: 'Account Suspended',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    ip: '197.234.2.12',
    success: false
  },
  {
    userId: '654321098765432109876544',
    userName: 'Robert Cam',
    userRole: 'LRO',
    action_type: 'Create',
    description: 'New Plot Registered',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    ip: '197.234.1.77',
    success: true
  },
  {
    userId: 'anonymous',
    userName: 'Anonymous User',
    userRole: 'Guest',
    action_type: 'Auth',
    description: 'Login Failed (Attempt 3)',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    ip: '203.0.113.9',
    success: false
  },
  {
    userId: '654321098765432109876545',
    userName: 'Fatou Diallo',
    userRole: 'Client',
    action_type: 'Create',
    description: 'Transfer Request Submitted',
    timestamp: new Date(Date.now() - 1000 * 60 * 240),
    ip: '197.234.3.01',
    success: true
  },
  {
    userId: '654321098765432109876546',
    userName: 'Cécile Mbarga',
    userRole: 'LRO',
    action_type: 'Create',
    description: 'Notice Published',
    timestamp: new Date(Date.now() - 1000 * 60 * 300),
    ip: '197.234.1.55',
    success: true
  }
];

// @desc    Get all activity logs
// @route   GET /api/logs
// @access  Private/Admin
exports.getAllLogs = async (req, res) => {
    try {
        let count = await Log.countDocuments();
        if (count === 0) {
            await Log.create(seedLogs);
        }
        const logs = await Log.find().sort({ timestamp: -1 });
        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Create a new activity log
// @route   POST /api/logs
// @access  Private
exports.createLog = async (req, res) => {
    try {
        const { userId, userName, userRole, action_type, description, ip, success } = req.body;
        
        const log = await Log.create({
            userId: userId || req.user?.id || 'anonymous',
            userName: userName || (req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Anonymous User'),
            userRole: userRole || req.user?.role || 'Guest',
            action_type,
            description,
            ip: ip || req.ip || '192.168.1.105',
            success: success !== undefined ? success : true
        });

        res.status(201).json({
            success: true,
            data: log
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
