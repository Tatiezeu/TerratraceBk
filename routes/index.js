const express = require('express');
const router = express.Router();

// Define routes here
const authRoutes = require('./authRoutes');
const landRoutes = require('./landRoutes');
const transferRoutes = require('./transferRoutes');
const userRoutes = require('./userRoutes');
const configRoutes = require('./configRoutes');

router.use('/auth', authRoutes);
router.use('/land', landRoutes);
router.use('/transfer', transferRoutes);
router.use('/users', userRoutes);
router.use('/config', configRoutes);

router.get('/health', (req, res) => {
    res.json({ status: 'API is healthy' });
});

module.exports = router;
