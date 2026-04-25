const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../utils/upload');

router.use(protect);

router.post('/initiate', upload.array('attachments', 10), (req, res, next) => {
    // Map files to clientDocuments
    if (req.files) {
        req.body.clientDocuments = req.files.map(f => `/uploads/${f.filename}`);
    }
    next();
}, transferController.initiateTransfer);

router.get('/my-transfers', transferController.getMyTransfers);
router.get('/public-notices', transferController.getPublicNotices);
router.get('/:id', transferController.getTransferDetails);

router.patch('/:id/status', upload.fields([
    { name: 'attachments', maxCount: 10 }, 
    { name: 'receipt', maxCount: 1 }      
]), (req, res, next) => {
    // Logic: If status is Awaiting_Fee_Payment, attachments are buyerDocuments (drafts)
    // Logic: If status is Payment_Verified, attachments are certifiedDocuments (final)
    if (req.files && req.files.attachments) {
        const filePaths = req.files.attachments.map(f => `/uploads/${f.filename}`);
        if (req.body.status === 'Awaiting_Fee_Payment') {
            req.body.buyerDocuments = filePaths;
        } else if (req.body.status === 'Payment_Verified') {
            req.body.certifiedDocuments = filePaths;
        } else {
            // General attachments
            req.body.buyerDocuments = filePaths;
        }
    }
    // Handle payment receipt upload from Client
    if (req.files && req.files.receipt) {
        req.body.paymentReceipt = `/uploads/${req.files.receipt[0].filename}`;
    }
    next();
}, transferController.updateTransferStatus);

router.post('/:id/objection', transferController.fileObjection);
router.patch('/plot/:plotId/dispute', transferController.updatePlotDispute);
router.post('/plot/:plotId/undispute', transferController.sendUndisputeRequest);

module.exports = router;
