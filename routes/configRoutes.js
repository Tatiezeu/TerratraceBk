const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', configController.getConfig);

// Admin-only operations
router.patch('/', restrictTo('Admin'), configController.updateConfig);
router.post('/test-email', restrictTo('Admin'), configController.testEmail);
router.post('/test-chatbot', restrictTo('Admin'), configController.testChatbot);

module.exports = router;
