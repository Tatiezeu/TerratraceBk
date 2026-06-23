const TransferRequest = require('../models/TransferRequest');
const LandPlot = require('../models/LandPlot');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.initiateTransfer = async (req, res) => {
    try {
        const { plotId, receiverId, notaryId, transferType, clientDocuments, isSubdivision, transferArea } = req.body;
        const subdivision = isSubdivision === 'true' || isSubdivision === true;

        const plot = await LandPlot.findById(plotId);
        if (!plot) return res.status(404).json({ success: false, message: 'Land plot not found' });

        // If the land plot is actively under review, block new initiation
        if (plot.status === 'under_review') {
            return res.status(400).json({
                success: false,
                message: 'A transfer request is already actively in progress for this land plot under review.'
            });
        }

        // Clean up any dangling pending/active requests for this plot to ensure only one active request exists
        await TransferRequest.updateMany(
            { 
                plot: plotId, 
                status: { $nin: ['Completed', 'Rejected', 'Cancelled'] } 
            },
            { 
                $set: { status: 'Cancelled' },
                $push: { 
                    history: { 
                        status: 'Cancelled', 
                        updatedBy: req.user.id, 
                        comment: 'Cancelled because a new transfer request was initiated for this plot.' 
                    } 
                }
            }
        );

        if (subdivision && transferArea >= plot.area) {
            return res.status(400).json({ success: false, message: 'Subdivision area must be strictly less than total area' });
        }

        const isDirectGrant = transferType === 'direct_grant';
        
        // For direct grant, we find an LRO to assign to
        let assignedLro = null;
        if (isDirectGrant) {
            const lroUser = await User.findOne({ role: 'LRO' });
            assignedLro = lroUser ? lroUser._id : null;
        }

        const transferRequest = await TransferRequest.create({
            plot: plotId,
            sender: req.user.id,
            receiver: receiverId || req.user.id, 
            notary: isDirectGrant ? undefined : notaryId,
            lro: assignedLro,
            transferType,
            isSubdivision: subdivision,
            transferArea: subdivision ? transferArea : plot.area,
            clientDocuments: clientDocuments || [],
            status: isDirectGrant ? 'Forwarded_to_LRO' : 'Initiated'
        });

        plot.status = 'under_review';
        await plot.save();

        if (isDirectGrant && assignedLro) {
            // Notify LRO directly
            await Notification.create({
                recipient: assignedLro,
                sender: req.user.id,
                type: 'system',
                title: 'New Direct Grant Application',
                message: `A new direct grant application for plot ${plot.landCode} has been submitted directly for your review.`,
                relatedPlot: plotId
            });
        } else if (notaryId) {
            // Notify Notary
            await Notification.create({
                recipient: notaryId,
                sender: req.user.id,
                type: 'system',
                title: 'New Transfer Request',
                message: `A new ${transferType} request for plot ${plot.landCode} has been assigned to you.`,
                relatedPlot: plotId
            });
        }

        res.status(201).json({ success: true, data: transferRequest });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getTransferDetails = async (req, res) => {
    try {
        const transfer = await TransferRequest.findById(req.params.id)
            .populate('plot', 'landCode location area status coverImage plotNumber regionCode')
            .populate('sender', 'firstName lastName email profilePic')
            .populate('receiver', 'firstName lastName email profilePic')
            .populate('notary', 'firstName lastName email profilePic')
            .populate('lro', 'firstName lastName email profilePic')
            .lean();

        if (!transfer) return res.status(404).json({ success: false, message: 'Transfer request not found' });
        res.status(200).json({ success: true, data: transfer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Real-time progress tracker — returns structured stage data for the frontend tracker UI
exports.getTransferProgress = async (req, res) => {
    try {
        const transfer = await TransferRequest.findById(req.params.id)
            .populate('plot', 'landCode location area status')
            .populate('sender', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email')
            .populate('notary', 'firstName lastName email')
            .populate('lro', 'firstName lastName email')
            .lean();

        if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

        // Define ordered stages based on transfer type
        const isDirectGrant = transfer.transferType === 'direct_grant';
        const allStages = isDirectGrant
            ? [
                { key: 'Initiated',          label: 'Request Initiated',        icon: 'file-text' },
                { key: 'Forwarded_to_LRO',   label: 'Forwarded to LRO',         icon: 'send' },
                { key: 'Public_Notice',      label: 'Public Notice Published',   icon: 'megaphone' },
                { key: 'Completed',          label: 'Transfer Completed',        icon: 'check-circle' },
            ]
            : [
                { key: 'Initiated',           label: 'Request Initiated',         icon: 'file-text' },
                { key: 'Under_Verification',  label: 'Under Notary Verification', icon: 'search' },
                { key: 'Awaiting_Fee_Payment',label: 'Fee Payment Required',      icon: 'credit-card' },
                { key: 'Payment_Submitted',   label: 'Payment Receipt Submitted', icon: 'upload' },
                { key: 'Payment_Verified',    label: 'Payment Verified',          icon: 'badge-check' },
                { key: 'Forwarded_to_LRO',   label: 'Forwarded to LRO',          icon: 'send' },
                { key: 'Public_Notice',      label: 'Public Notice Published',    icon: 'megaphone' },
                { key: 'Completed',          label: 'Transfer Completed',         icon: 'check-circle' },
            ];

        const currentStatusIndex = allStages.findIndex(s => s.key === transfer.status);
        const isRejectedOrCancelled = ['Rejected', 'Cancelled'].includes(transfer.status);

        const stages = allStages.map((stage, i) => {
            let stageStatus = 'pending';
            if (isRejectedOrCancelled && i <= currentStatusIndex) {
                stageStatus = i < currentStatusIndex ? 'completed' : 'failed';
            } else if (i < currentStatusIndex) {
                stageStatus = 'completed';
            } else if (i === currentStatusIndex) {
                stageStatus = 'active';
            }

            // Find the history entry for this stage
            const historyEntry = transfer.history
                ? [...transfer.history].reverse().find(h => h.status === stage.key)
                : null;

            return {
                ...stage,
                status: stageStatus,
                completedAt: historyEntry?.timestamp || null,
                comment: historyEntry?.comment || null,
            };
        });

        res.status(200).json({
            success: true,
            data: {
                transferId: transfer._id,
                currentStatus: transfer.status,
                isCompleted: transfer.status === 'Completed',
                isRejected: isRejectedOrCancelled,
                transferType: transfer.transferType,
                plot: transfer.plot,
                sender: transfer.sender,
                receiver: transfer.receiver,
                notary: transfer.notary,
                lro: transfer.lro,
                publicNotice: transfer.publicNotice,
                feeNotice: transfer.feeNotice,
                clientDocuments: transfer.clientDocuments || [],
                buyerDocuments: transfer.buyerDocuments || [],
                certifiedDocuments: transfer.certifiedDocuments || [],
                paymentReceipt: transfer.paymentReceipt,
                stages,
                history: transfer.history || [],
                objections: transfer.objections || [],
            }
        });
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
                message: `Notary has requested payment of ${feeNotice.amount} CFA for plot ${transfer.plot.landCode}. Please note that payment should be made in cash at the level of the MINDCAF.`,
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
            let finalEndDate = endDate;
            if (!finalEndDate) {
                const SystemConfig = require('../models/SystemConfig');
                const testModeConfig = await SystemConfig.findOne({ key: 'noticeTestMode' });
                const testMinutesConfig = await SystemConfig.findOne({ key: 'noticeTestMinutes' });
                const durationDaysConfig = await SystemConfig.findOne({ key: 'noticeDurationDays' });

                const testMode = testModeConfig ? testModeConfig.value : false;
                const testMinutes = testMinutesConfig ? testMinutesConfig.value : 10;
                const durationDays = durationDaysConfig ? durationDaysConfig.value : 30;

                const durationMs = testMode 
                    ? testMinutes * 60 * 1000 
                    : durationDays * 24 * 60 * 60 * 1000;
                finalEndDate = new Date(Date.now() + durationMs);
            }
            transfer.publicNotice = {
                startDate: startDate || Date.now(),
                endDate: finalEndDate,
                isActive: true
            };

            // Ensure participants are populated to get names
            if (!transfer.sender.firstName || !transfer.receiver.firstName) {
                await transfer.populate('sender receiver');
            }
            const senderName = "the Government of Cameroon";
            const receiverName = `${transfer.receiver.firstName} ${transfer.receiver.lastName}`;

            // Notify all participants (filter out undefined notary for direct grants)
            const pids = [transfer.sender?._id, transfer.receiver?._id, transfer.notary].filter(Boolean);
            for (const pid of pids) {
                await Notification.create({
                    recipient: pid,
                    sender: req.user.id,
                    type: 'system',
                    title: 'Public Notice Published',
                    message: `The public notice for plot ${transfer.plot.landCode} located at ${transfer.plot.location} (${transfer.plot.area} sqm), being transferred from ${senderName} to ${receiverName}, has been published and is active until ${new Date(transfer.publicNotice.endDate).toLocaleDateString()}.`,
                    relatedPlot: transfer.plot._id
                });
            }
        } else if (status === 'Completed') {
            if (transfer.status === 'Rejected') {
                return res.status(400).json({ success: false, message: 'This transfer request has been rejected.' });
            }
            if (transfer.publicNotice?.isActive && new Date() < new Date(transfer.publicNotice.endDate)) {
                return res.status(400).json({ success: false, message: 'Public notice period is still active.' });
            }
            if (transfer.plot.status === 'disputed') {
                return res.status(400).json({ success: false, message: 'Land is currently disputed. Resolve disputes first.' });
            }

            const plot = await LandPlot.findById(transfer.plot._id);
            const buyer = transfer.receiver;

            if (transfer.isSubdivision) {
                // --- SUBDIVISION LOGIC ---
                const transferredArea = parseFloat(transfer.transferArea);
                const remainingArea = plot.area - transferredArea;

                // 1. Create NEW plot for the buyer
                const isStateBuyer = buyer.role === 'Admin';
                const buyerCni = buyer.cniNumber || '000000000';
                const cniSegment = isStateBuyer ? '00000' : buyerCni.slice(-5);
                const typeCode = isStateBuyer ? "00050" : (transfer.transferType === 'direct_grant' ? "10005" : (plot.landType || "10005"));
                const regionCode = plot.regionCode || "01";
                
                await LandPlot.create({
                    landCode: `${typeCode}-${regionCode}-${cniSegment}-${plot.plotNumber || '000'}-P${Date.now().toString().slice(-4)}`,
                    owner: buyer._id,
                    landType: typeCode,
                    regionCode: plot.regionCode,
                    plotNumber: `${plot.plotNumber}-P`,
                    location: plot.location,
                    price: (plot.price / plot.area) * transferredArea,
                    area: transferredArea,
                    coordinates: plot.coordinates,
                    coverImage: plot.coverImage,
                    status: 'transferred',
                    lastTransferDate: Date.now(),
                    ownershipHistory: [{
                        owner: plot.owner,
                        acquiredDate: plot.lastTransferDate || plot.createdAt,
                        transferDate: Date.now(),
                        transferType: transfer.transferType,
                        previousLandCode: plot.landCode
                    }]
                });

                // 2. Update ORIGINAL plot area for the seller
                plot.area = remainingArea;
                plot.status = 'cleared';
                plot.price = (plot.price / plot.area) * remainingArea;
                await plot.save();
            } else {
                // --- FULL TRANSFER LOGIC ---
                plot.ownershipHistory.push({
                    owner: plot.owner,
                    acquiredDate: plot.lastTransferDate || plot.createdAt,
                    transferDate: Date.now(),
                    transferType: transfer.transferType,
                    previousLandCode: plot.landCode
                });

                const isStateBuyer = buyer.role === 'Admin';
                const buyerCni = buyer.cniNumber || '000000000';
                const cniSegment = isStateBuyer ? '00000' : buyerCni.slice(-5);
                const typeCode = isStateBuyer ? "00050" : (transfer.transferType === 'direct_grant' ? "10005" : (plot.landType || "10005"));
                const regionCode = plot.regionCode || "01";
                
                plot.landCode = `${typeCode}-${regionCode}-${cniSegment}-${plot.plotNumber || '000'}`;
                plot.landType = typeCode; 
                plot.owner = buyer._id;
                plot.status = 'transferred';
                plot.lastTransferDate = Date.now();
                await plot.save();
            }

            // Upgrade Client to Landowner role upon successful purchase/transfer completion
            if (buyer && buyer.role === 'Client') {
                await User.findByIdAndUpdate(buyer._id, { role: 'Landowner' });
            }

            const participants = [transfer.sender?._id || transfer.sender, transfer.receiver?._id || transfer.receiver, transfer.notary].filter(Boolean);
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

            // Mark all other pending transfer requests for the same plot as Cancelled
            await TransferRequest.updateMany(
                { 
                    plot: plot._id, 
                    _id: { $ne: transfer._id },
                    status: { $nin: ['Completed', 'Rejected', 'Cancelled'] }
                },
                { 
                    $set: { status: 'Cancelled' },
                    $push: { 
                        history: { 
                            status: 'Cancelled', 
                            updatedBy: req.user.id, 
                            comment: 'Request cancelled because another transfer for this plot was completed.' 
                        } 
                    }
                }
            );
        } else if (status === 'Rejected') {
            if (transfer.plot) {
                const plot = await LandPlot.findById(transfer.plot._id);
                if (plot) {
                    plot.status = 'cleared';
                    await plot.save();
                }
            }

            // Notify Client / Initiator
            await Notification.create({
                recipient: transfer.sender._id || transfer.sender,
                sender: req.user.id,
                type: 'system',
                title: 'Transfer Request Rejected',
                message: `Your transfer application for plot ${transfer.plot?.landCode} has been officially rejected by the Land Registry Officer. Reason: ${feedback || 'No reason provided.'}`,
                relatedPlot: transfer.plot?._id
            });

            // Notify Notary Officer
            if (transfer.notary) {
                await Notification.create({
                    recipient: transfer.notary,
                    sender: req.user.id,
                    type: 'system',
                    title: 'Transfer Request Rejected by LRO',
                    message: `The transfer application for plot ${transfer.plot?.landCode} has been officially rejected by the Land Registry Officer. Reason: ${feedback || 'No reason provided.'}`,
                    relatedPlot: transfer.plot?._id
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

        // Notify relevant participants
        const participants = [transfer.sender, transfer.receiver, transfer.lro?._id].filter(Boolean);
        for (const pid of participants) {
            await Notification.create({
                recipient: pid,
                sender: req.user.id,
                type: 'system',
                title: 'New Objection Filed',
                message: `A formal objection has been filed against the transfer of plot ${transfer.plot.landCode}. The process is now subject to administrative review.`,
                relatedPlot: transfer.plot._id
            });
        }

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
            .populate({
                path: 'plot',
                select: 'landCode location area coverImage status plotNumber owner',
                populate: {
                    path: 'owner',
                    select: 'firstName lastName email'
                }
            })
            .populate('sender', 'firstName lastName email profilePic')
            .populate('receiver', 'firstName lastName email profilePic')
            .populate('notary', 'firstName lastName profilePic')
            .sort('-updatedAt')
            .lean();

        // Optional: Filter to show only the most recent request per plot to avoid UI clutter from duplicates
        const uniquePlots = new Set();
        const filteredTransfers = transfers.filter(t => {
            if (uniquePlots.has(t.plot._id.toString())) return false;
            uniquePlots.add(t.plot._id.toString());
            return true;
        });

        res.status(200).json({ success: true, count: filteredTransfers.length, data: filteredTransfers });
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
            .sort('-updatedAt')
            .lean();

        res.status(200).json({ success: true, data: notices });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateDocuments = async (req, res) => {
    try {
        const { documents, type } = req.body; // type: 'clientDocuments' or 'buyerDocuments'
        const transfer = await TransferRequest.findById(req.params.id);
        
        if (!transfer) return res.status(404).json({ success: false, message: 'Transfer request not found' });

        // Authorization: Only sender can update clientDocuments, only receiver or notary can update buyerDocuments?
        // For simplicity, let's allow it if they are part of the transfer
        const isParticipant = [transfer.sender.toString(), transfer.receiver.toString(), transfer.notary?.toString()].includes(req.user.id);
        if (!isParticipant && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update documents for this transfer' });
        }

        if (type === 'clientDocuments') {
            transfer.clientDocuments = documents;
        } else if (type === 'buyerDocuments') {
            transfer.buyerDocuments = documents;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid document type' });
        }

        await transfer.save();
        res.status(200).json({ success: true, message: 'Documents updated successfully', data: transfer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { documentUrl, type } = req.body; // type: 'clientDocuments' or 'buyerDocuments'
        const transfer = await TransferRequest.findById(req.params.id);
        
        if (!transfer) return res.status(404).json({ success: false, message: 'Transfer request not found' });

        const isParticipant = [transfer.sender.toString(), transfer.receiver.toString(), transfer.notary?.toString()].includes(req.user.id);
        if (!isParticipant && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (type === 'clientDocuments') {
            transfer.clientDocuments = transfer.clientDocuments.filter(doc => doc !== documentUrl);
        } else if (type === 'buyerDocuments') {
            transfer.buyerDocuments = transfer.buyerDocuments.filter(doc => doc !== documentUrl);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid document type' });
        }

        await transfer.save();
        res.status(200).json({ success: true, message: 'Document removed successfully', data: transfer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearAllPublicNotices = async (req, res) => {
    try {
        const result = await TransferRequest.deleteMany({ status: 'Public_Notice' });
        res.status(200).json({
            success: true,
            message: `Successfully cleared all public notices. Deleted ${result.deletedCount} notices.`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
