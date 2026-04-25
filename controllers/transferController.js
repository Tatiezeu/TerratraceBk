const TransferRequest = require('../models/TransferRequest');
const LandPlot = require('../models/LandPlot');
const User = require('../models/User');

exports.initiateTransfer = async (req, res) => {
    try {
        const { plotId, receiverId, notaryId, transferType, documents, portionType, surfaceArea } = req.body;

        const plot = await LandPlot.findById(plotId);
        if (!plot) {
            return res.status(404).json({ success: false, message: 'Land plot not found' });
        }

        const transferRequest = await TransferRequest.create({
            plot: plotId,
            sender: req.user.id,
            receiver: receiverId || req.user.id, // For Direct Grant, receiver is the initiator
            notary: notaryId,
            transferType,
            portionType: portionType || 'full',
            surfaceArea: surfaceArea || plot.area,
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
            const receiver = await User.findById(transfer.receiver);
            
            const parts = plot.landCode.split('-');
            let typeCode = parts[0];
            const regionCode = parts[1];
            let ownerId = receiver.cniNumber ? receiver.cniNumber.slice(-5).padStart(5, '0') : '00000';
            let plotNum = parts[3] || '000';

            // Logic for Direct Grant
            if (transfer.transferType === 'direct_grant') {
                typeCode = '10005'; // Change to Private
            }

            // Logic for Sub Portion
            if (transfer.portionType === 'sub') {
                // Generate a new plot number (random 4 digits for now)
                plotNum = Math.floor(1000 + Math.random() * 9000).toString();
                plot.area = transfer.surfaceArea; // Update area if it's a sub portion
            }

            plot.landCode = `${typeCode}-${regionCode}-${ownerId}-${plotNum}`;
            plot.landType = typeCode;
            plot.owner = transfer.receiver;
            plot.status = 'cleared'; // Reset to cleared for the new owner
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
