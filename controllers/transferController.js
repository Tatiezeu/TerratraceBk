const TransferRequest = require('../models/TransferRequest');
const LandPlot = require('../models/LandPlot');

exports.initiateTransfer = async (req, res) => {
    try {
        const { plotId, receiverId, notaryId, transferType, documents } = req.body;

        const plot = await LandPlot.findById(plotId);
        if (!plot) {
            return res.status(404).json({ success: false, message: 'Land plot not found' });
        }

        if (plot.status !== 'cleared') {
            return res.status(400).json({ success: false, message: `Cannot initiate transfer. Plot status is ${plot.status}, but must be 'cleared'.` });
        }

        const transferRequest = await TransferRequest.create({
            plot: plotId,
            sender: req.user.id,
            receiver: receiverId,
            notary: notaryId,
            transferType,
            documents,
            status: 'Initiated'
        });

        // Update plot status to Pending
        plot.status = 'Pending';
        await plot.save();

        res.status(201).json({
            success: true,
            data: transferRequest
        });
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
            .populate('notary', 'firstName lastName');

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer request not found' });
        }

        res.status(200).json({
            success: true,
            data: transfer
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateTransferStatus = async (req, res) => {
    try {
        const { status, feedback } = req.body;
        const transfer = await TransferRequest.findById(req.params.id);

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer request not found' });
        }

        // Add to history
        transfer.history.push({
            status: transfer.status,
            updatedBy: req.user.id,
            comment: feedback || `Status changed to ${status}`
        });

        transfer.status = status;
        if (req.user.role === 'Notary') transfer.notaryFeedback = feedback;
        if (req.user.role === 'LRO') transfer.lroFeedback = feedback;

        await transfer.save();

        // If completed, update land ownership
        if (status === 'Completed') {
            const plot = await LandPlot.findById(transfer.plot);
            plot.owner = transfer.receiver;
            plot.status = 'Sold';
            await plot.save();
        }

        res.status(200).json({
            success: true,
            data: transfer
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
