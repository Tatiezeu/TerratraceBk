const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../utils/upload');

router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.get('/sent', notificationController.getMySentNotifications);
router.post('/unblock-request', notificationController.sendUnblockRequest);
router.post('/send', upload.array('attachments', 5), notificationController.sendMessage);
router.patch('/:id/status', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.delete('/', notificationController.clearAll);

module.exports = router;
