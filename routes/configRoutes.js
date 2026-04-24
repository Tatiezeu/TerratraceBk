const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);
router.use(restrictTo('SuperAdmin'));

router.get('/', configController.getConfig);
router.patch('/', configController.updateConfig);
router.post('/test-email', configController.testEmail);

module.exports = router;
