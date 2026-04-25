const LandPlot = require('../models/LandPlot');
const User = require('../models/User');
const { generateLandCode } = require('../utils/algorithm');

exports.registerLandAndOwner = async (req, res) => {
    try {
        const { 
            landType, regionCode, plotNumber, location, price, area, coordinates, description, matterportId,
            ownerFirstName, ownerLastName, ownerEmail, ownerPhone, ownerCNI, ownerPassword, status
        } = req.body;

        // 1) Create or find user
        let user;
        if (landType === "00050" || landType === "public") {
            user = await User.findOne({ role: "SuperAdmin" });
        } else {
            user = await User.findOne({ email: ownerEmail });
            if (!user) {
                user = await User.create({
                    firstName: ownerFirstName,
                    lastName: ownerLastName,
                    email: ownerEmail,
                    phone: ownerPhone,
                    cniNumber: ownerCNI,
                    password: ownerPassword,
                    role: "Landowner",
                    isVerified: true,
                    status: "active"
                });
            }
        }

        // 2) Generate land code
        const finalPlotNumber = (landType === "00050" || landType === "public") ? (plotNumber || Math.floor(1000 + Math.random() * 9000).toString()) : plotNumber;
        const landCode = generateLandCode(landType === "public" ? "00050" : landType, regionCode, (landType === "public" || landType === "00050") ? "00000" : (user.cniNumber || "00000"), finalPlotNumber);

        // 3) Create land plot
        const newPlot = await LandPlot.create({
            landCode,
            owner: user._id,
            landType: landType === "public" ? "00050" : landType,
            regionCode,
            plotNumber: finalPlotNumber,
            location: location || 'Not Specified',
            price: price || 0,
            area: area || 0,
            coordinates,
            matterportId,
            description,
            coverImage: req.file ? `/assets/images/plots/${req.file.filename}` : 'default-plot.jpg',
            status: status || ((landType === "public" || landType === "00050") ? "flagged" : "cleared")
        });

        res.status(201).json({
            success: true,
            message: 'Landowner and Plot registered successfully',
            data: {
                user,
                plot: newPlot
            }
        });
    } catch (err) {
        console.error('LRO Registration Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createLandPlot = async (req, res) => {
    try {
        const { location, price, area, coordinates, matterportId, description, landType, regionCode, plotNumber, status } = req.body;
        
        // Use authenticated user as owner
        const owner = req.user.id;
        const cniNumber = req.user.cniNumber;

        if (!cniNumber) {
            return res.status(400).json({ success: false, message: 'User CNI number is required for land registration' });
        }

        // Generate the unique land code using the new algorithm
        const landCode = generateLandCode(landType === "public" ? "00050" : landType, regionCode, cniNumber, plotNumber);

        // Check if landCode already exists
        const existing = await LandPlot.findOne({ landCode });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A land plot with this code already exists' });
        }

        const newPlot = await LandPlot.create({
            landCode,
            owner,
            landType: landType === "public" ? "00050" : landType,
            regionCode,
            plotNumber,
            location,
            price,
            area,
            coordinates,
            matterportId,
            description,
            coverImage: req.file ? `/assets/images/plots/${req.file.filename}` : 'default-plot.jpg',
            status: status || ((landType === "public" || landType === "00050") ? "flagged" : "cleared")
        });

        res.status(201).json({
            success: true,
            data: newPlot
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllPlots = async (req, res) => {
    try {
        const plots = await LandPlot.find().populate('owner', 'firstName lastName');
        res.status(200).json({
            success: true,
            count: plots.length,
            data: plots
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyPlots = async (req, res) => {
    try {
        let query = { owner: req.user.id };
        
        // If SuperAdmin, also include all state-owned plots
        if (req.user.role === 'SuperAdmin') {
            query = {
                $or: [
                    { owner: req.user.id },
                    { landType: '00050' }
                ]
            };
        }

        const plots = await LandPlot.find(query);
        res.status(200).json({
            success: true,
            count: plots.length,
            data: plots
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPlotByCode = async (req, res) => {
    try {
        const plot = await LandPlot.findOne({ landCode: req.params.code }).populate('owner', 'firstName lastName');
        if (!plot) {
            return res.status(404).json({ success: false, message: 'Land plot not found' });
        }
        res.status(200).json({
            success: true,
            data: plot
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
