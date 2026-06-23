const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Users can create logs on operations, but only SuperAdmin can fetch all audit trail logs
router.post('/', logController.createLog);
router.get('/', restrictTo('Admin'), logController.getAllLogs);

module.exports = router;
