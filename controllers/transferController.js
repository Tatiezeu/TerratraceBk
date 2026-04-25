const TransferRequest = require('../models/TransferRequest');
const LandPlot = require('../models/LandPlot');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.initiateTransfer = async (req, res) => {
    try {
        const { plotId, receiverId, notaryId, transferType, clientDocuments } = req.body;

        const plot = await LandPlot.findById(plotId);
        if (!plot) return res.status(404).json({ success: false, message: 'Land plot not found' });

        const transferRequest = await TransferRequest.create({
            plot: plotId,
            sender: req.user.id,
            receiver: receiverId || req.user.id, 
            notary: notaryId,
            transferType,
            clientDocuments: clientDocuments || [],
            status: 'Initiated'
        });

        plot.status = 'under_review';
        await plot.save();

        // Notify Notary
        await Notification.create({
            recipient: notaryId,
            sender: req.user.id,
            type: 'system',
            title: 'New Transfer Request',
            message: `A new ${transferType} request for plot ${plot.landCode} has been assigned to you.`,
            relatedPlot: plotId
        });

        res.status(201).json({ success: true, data: transferRequest });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getTransferDetails = async (req, res) => {
    try {
        const transfer = await TransferRequest.findById(req.params.id)
            .populate('plot')
            .populate('sender', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email')
            .populate('notary', 'firstName lastName email')
            .populate('lro', 'firstName lastName email');

        if (!transfer) return res.status(404).json({ success: false, message: 'Transfer request not found' });
        res.status(200).json({ success: true, data: transfer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateTransferStatus = async (req, res) => {
    try {
        const { status, feedback, buyerDocuments, feeNotice, paymentReceipt, lroId } = req.body;
        const transfer = await TransferRequest.findById(req.params.id).populate('plot sender receiver');

        if (!transfer) return res.status(404).json({ success: false, message: 'Transfer request not found' });

        // Update fields based on status
        if (status === 'Under_Verification') {
            // Notary starts verification
        } else if (status === 'Awaiting_Fee_Payment') {
            transfer.buyerDocuments = buyerDocuments || transfer.buyerDocuments;
            transfer.feeNotice = {
                amount: feeNotice.amount,
                description: feeNotice.description,
                sentAt: Date.now()
            };
            // Notify Client
            await Notification.create({
                recipient: transfer.sender._id,
                sender: req.user.id,
                type: 'system',
                title: 'Payment Fee Notice',
                message: `Notary has requested payment of ${feeNotice.amount} CFA for plot ${transfer.plot.landCode}.`,
                relatedPlot: transfer.plot._id
            });
        } else if (status === 'Payment_Submitted') {
            transfer.paymentReceipt = paymentReceipt;
            // Notify Notary
            await Notification.create({
                recipient: transfer.notary,
                sender: req.user.id,
                type: 'system',
                title: 'Payment Receipt Uploaded',
                message: `Client has uploaded the payment receipt for plot ${transfer.plot.landCode}.`,
                relatedPlot: transfer.plot._id
            });
        } else if (status === 'Payment_Verified') {
            transfer.certifiedDocuments = req.body.certifiedDocuments || transfer.certifiedDocuments;
            // Notify Client
            await Notification.create({
                recipient: transfer.sender._id,
                sender: req.user.id,
                type: 'system',
                title: 'Payment Confirmed',
                message: `Notary has confirmed your payment for plot ${transfer.plot.landCode} and certified the transfer documents.`,
                relatedPlot: transfer.plot._id
            });
        } else if (status === 'Forwarded_to_LRO') {
            transfer.lro = lroId;
            // Notify LRO
            await Notification.create({
                recipient: lroId,
                sender: req.user.id,
                type: 'system',
                title: 'Application Forwarded for Review',
                message: `Notary has forwarded the application for plot ${transfer.plot.landCode} to you.`,
                relatedPlot: transfer.plot._id
            });
        } else if (status === 'Public_Notice') {
            const { startDate, endDate } = req.body.publicNotice || {};
            transfer.publicNotice = {
                startDate: startDate || Date.now(),
                endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                isActive: true
            };
            // Notify all participants
            const pids = [transfer.sender._id, transfer.receiver._id, transfer.notary];
            for (const pid of pids) {
                await Notification.create({
                    recipient: pid,
                    sender: req.user.id,
                    type: 'system',
                    title: 'Public Notice Published',
                    message: `The public notice for plot ${transfer.plot.landCode} has been published and is active until ${new Date(transfer.publicNotice.endDate).toLocaleDateString()}.`,
                    relatedPlot: transfer.plot._id
                });
            }
        } else if (status === 'Completed') {
            if (transfer.publicNotice?.isActive && new Date() < new Date(transfer.publicNotice.endDate)) {
                return res.status(400).json({ success: false, message: 'Public notice period is still active.' });
            }
            if (transfer.plot.status === 'disputed') {
                return res.status(400).json({ success: false, message: 'Land is currently disputed. Resolve disputes first.' });
            }

            const plot = await LandPlot.findById(transfer.plot._id);
            const buyer = transfer.receiver;
            const seller = transfer.sender;

            // Update History
            plot.ownershipHistory.push({
                owner: plot.owner,
                acquiredDate: plot.lastTransferDate || plot.createdAt,
                transferDate: Date.now(),
                transferType: transfer.transferType,
                previousLandCode: plot.landCode
            });

            // Generate New Land Code
            // User requested: "land code generated becomes a public land with owner id 00000"
            const typeCode = plot.landType || "10005";
            const regionCode = plot.regionCode || "01";
            const ownerIdSegment = "00000"; // State land identifier as requested
            
            plot.landCode = `${typeCode}-${regionCode}-${ownerIdSegment}-${plot.plotNumber || '000'}`;
            plot.owner = buyer._id;
            plot.status = 'transferred';
            plot.lastTransferDate = Date.now();
            await plot.save();

            const participants = [transfer.sender._id, transfer.receiver._id, transfer.notary];
            for (const pid of participants) {
                await Notification.create({
                    recipient: pid,
                    sender: req.user.id,
                    type: 'system',
                    title: 'Transfer Completed & Authorized',
                    message: `The transfer for plot ${plot.landCode} has been successfully authorized. The plot is now registered under the new owner but remains in 'transferred' status for a 1-year verification period.`,
                    relatedPlot: plot._id
                });
            }
        }

        transfer.status = status;
        if (feedback) {
            if (req.user.role === 'Notary') transfer.notaryFeedback = feedback;
            if (req.user.role === 'LRO') transfer.lroFeedback = feedback;
        }

        transfer.history.push({
            status: status,
            updatedBy: req.user.id,
            comment: feedback || `Status changed to ${status}`
        });

        await transfer.save();
        res.status(200).json({ success: true, data: transfer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.fileObjection = async (req, res) => {
    try {
        const { reason, attachments } = req.body;
        const transfer = await TransferRequest.findById(req.params.id).populate('plot lro');
        if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

        transfer.objections.push({
            sender: req.user.id,
            reason,
            attachments: attachments || []
        });

        await transfer.save();

        // Notify LRO
        await Notification.create({
            recipient: transfer.lro?._id,
            sender: req.user.id,
            type: 'system',
            title: 'New Objection Filed',
            message: `A formal objection has been filed against the transfer of plot ${transfer.plot.landCode}.`,
            relatedPlot: transfer.plot._id
        });

        res.status(200).json({ success: true, message: 'Objection filed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePlotDispute = async (req, res) => {
    try {
        const { status, feedback } = req.body; // status: 'disputed', 'cleared', 'under_review'
        const plot = await LandPlot.findById(req.params.plotId);
        if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

        plot.status = status;
        await plot.save();

        // If disputed, find active transfer and notify
        const transfer = await TransferRequest.findOne({ plot: plot._id, status: { $ne: 'Completed' } });
        if (transfer) {
            await Notification.create({
                recipient: transfer.sender,
                sender: req.user.id,
                type: 'system',
                title: `Land Status Updated: ${status.toUpperCase()}`,
                message: `The LRO has updated the status of plot ${plot.landCode} to ${status}. ${feedback || ''}`,
                relatedPlot: plot._id
            });
        }

        res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendUndisputeRequest = async (req, res) => {
    try {
        const { message, attachments } = req.body;
        const plot = await LandPlot.findById(req.params.plotId);
        if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

        // Find LRO who handled this or is regional
        const transfer = await TransferRequest.findOne({ plot: plot._id }).sort('-createdAt');
        const recipientId = transfer?.lro || plot.regionCode; // Fallback or logic

        await Notification.create({
            recipient: recipientId,
            sender: req.user.id,
            type: 'system',
            title: 'Undispute Request',
            message: `Client has sent an undispute request for plot ${plot.landCode}: ${message}`,
            relatedPlot: plot._id,
            attachments: attachments || []
        });

        res.status(200).json({ success: true, message: 'Request sent to LRO' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyTransfers = async (req, res) => {
    try {
        const filters = {};
        if (req.user.role === 'Client' || req.user.role === 'Landowner') {
            filters.$or = [{ sender: req.user.id }, { receiver: req.user.id }];
        } else if (req.user.role === 'Notary') {
            filters.notary = req.user.id;
        } else if (req.user.role === 'LRO') {
            filters.lro = req.user.id;
        }

        const transfers = await TransferRequest.find(filters)
            .populate('plot')
            .populate('sender', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email')
            .populate('notary', 'firstName lastName')
            .sort('-updatedAt');

        res.status(200).json({ success: true, count: transfers.length, data: transfers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPublicNotices = async (req, res) => {
    try {
        const notices = await TransferRequest.find({ status: 'Public_Notice' })
            .populate('plot')
            .populate('sender', 'firstName lastName')
            .populate('lro', 'firstName lastName')
            .sort('-updatedAt');

        res.status(200).json({ success: true, data: notices });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
