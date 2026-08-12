const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const upload = require('../utils/upload');

// Public webhook route (called by CamPay without authentication)
router.post('/campay-webhook', transferController.campayWebhook);

router.use(protect);

router.post('/initiate', upload.array('attachments', 10), (req, res, next) => {
    // Map files to clientDocuments
    if (req.files) {
        req.body.clientDocuments = req.files.map(f => `/uploads/${f.filename}`);
    }
    next();
}, transferController.initiateTransfer);

// Specific routes MUST come before /:id to avoid conflicts
router.get('/my-transfers', transferController.getMyTransfers);
router.get('/public-notices', transferController.getPublicNotices);
router.delete('/public-notices', restrictTo('Admin'), transferController.clearAllPublicNotices);
router.patch('/plot/:plotId/dispute', transferController.updatePlotDispute);
router.post('/plot/:plotId/undispute', transferController.sendUndisputeRequest);

// Transfer detail routes
router.get('/:id/progress', transferController.getTransferProgress); // Real-time tracker
router.post('/:id/pay-fee', transferController.payFee);
router.get('/:id/check-payment', transferController.checkPaymentStatus);
router.post('/:id/upload-proof', upload.single('proofFile'), transferController.uploadPaymentProof);
router.post('/:id/confirm-payment', restrictTo('Notary', 'Admin'), transferController.confirmPaymentManually);
router.get('/:id', transferController.getTransferDetails);

router.patch('/:id/status', upload.fields([
    { name: 'attachments', maxCount: 10 }, 
    { name: 'receipt', maxCount: 1 }      
]), (req, res, next) => {
    if (req.files && req.files.attachments) {
        const filePaths = req.files.attachments.map(f => `/uploads/${f.filename}`);
        if (req.body.status === 'Awaiting_Fee_Payment') {
            req.body.buyerDocuments = filePaths;
        } else if (req.body.status === 'Payment_Verified' || req.body.status === 'Forwarded_to_LRO') {
            req.body.certifiedDocuments = filePaths;
        } else {
            req.body.buyerDocuments = filePaths;
        }
    }
    if (req.files && req.files.receipt) {
        req.body.paymentReceipt = `/uploads/${req.files.receipt[0].filename}`;
    }
    next();
}, transferController.updateTransferStatus);

router.post('/:id/objection', transferController.fileObjection);

// Document management
router.patch('/:id/update-documents', upload.array('attachments', 10), (req, res, next) => {
    if (req.files && req.files.length > 0) {
        req.body.documents = req.files.map(f => `/uploads/${f.filename}`);
    }
    next();
}, transferController.updateDocuments);

router.delete('/:id/document', transferController.deleteDocument);

module.exports = router;
