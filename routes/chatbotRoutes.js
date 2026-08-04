const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Chat endpoints (available to all logged-in users)
router.post('/chat', protect, chatbotController.chat);
router.post('/chat-stream', protect, chatbotController.streamChat);

// Training endpoints (Admin only)
router.get('/training', protect, restrictTo('Admin'), chatbotController.getTraining);
router.post('/train', protect, restrictTo('Admin'), chatbotController.train);

module.exports = router;
