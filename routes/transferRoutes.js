const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/initiate', transferController.initiateTransfer);
router.get('/:id', transferController.getTransferDetails);

// Only Notary, LRO, or Admin can update status
router.patch('/:id/status', restrictTo('Notary', 'LRO', 'SuperAdmin'), transferController.updateTransferStatus);

module.exports = router;
