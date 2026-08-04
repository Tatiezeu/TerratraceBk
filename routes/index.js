const express = require('express');
const router = express.Router();

// Define routes here
const authRoutes = require('./authRoutes');
const landRoutes = require('./landRoutes');
const transferRoutes = require('./transferRoutes');
const userRoutes = require('./userRoutes');
const configRoutes = require('./configRoutes');
const notificationRoutes = require('./notificationRoutes');
const logRoutes = require('./logRoutes');
const chatbotRoutes = require('./chatbotRoutes');
const projectRoutes = require('./projectRoutes');

router.use('/auth', authRoutes);
router.use('/land', landRoutes);
router.use('/transfer', transferRoutes);
router.use('/users', userRoutes);
router.use('/config', configRoutes);
router.use('/notifications', notificationRoutes);
router.use('/logs', logRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/projects', projectRoutes);

router.get('/health', (req, res) => {
    res.json({ status: 'API is healthy' });
});

module.exports = router;
