const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protect all routes after this middleware
router.use(protect);

router.get('/me', userController.getMe);
router.patch("/update-me", require("../utils/upload").single("profilePic"), userController.updateMe);
router.patch('/update-password', userController.updatePassword);

// Admin only routes
router.use(restrictTo('SuperAdmin'));
router.get('/', userController.getAllUsers);
router.post('/register-officer', userController.registerOfficer);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
