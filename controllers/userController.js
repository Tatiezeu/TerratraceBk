const User = require('../models/User');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Get current user profile
exports.getMe = async (req, res) => {
    try {
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Auto-sync Client <-> Landowner role based on real-time land plot ownership
        if (user.role === 'Client' || user.role === 'Landowner') {
            const LandPlot = require('../models/LandPlot');
            const plotsCount = await LandPlot.countDocuments({ owner: user._id });
            const expectedRole = plotsCount > 0 ? 'Landowner' : 'Client';
            if (user.role !== expectedRole) {
                user.role = expectedRole;
                await user.save();
            }
        }

        res.status(200).json({
            success: true,
            data: user.toObject()
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update user profile
exports.updateMe = async (req, res) => {
    try {
        // Prevent password updates via this route
        if (req.body.password) {
            return res.status(400).json({ 
                success: false, 
                message: 'This route is not for password updates. Please use /update-password' 
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Update fields if provided
        if (req.body.firstName) user.firstName = req.body.firstName;
        if (req.body.lastName) user.lastName = req.body.lastName;
        if (req.body.phone) user.phone = req.body.phone;
        if (req.body.profilePic) user.profilePic = req.body.profilePic;

        // Handle profile picture with sharp (fast, native image processing)
        if (req.file) {
            try {
                const buffer = await sharp(req.file.path)
                    .resize(400, 400, { fit: 'cover', position: 'centre' })
                    .webp({ quality: 85 })
                    .toBuffer();

                user.profilePic = `data:image/webp;base64,${buffer.toString('base64')}`;

                // Remove the original uploaded file to save space
                fs.unlink(req.file.path, () => {});
            } catch (imageError) {
                console.error('Sharp image processing failed:', imageError);
                try {
                    const rawBuffer = fs.readFileSync(req.file.path);
                    user.profilePic = `data:${req.file.mimetype};base64,${rawBuffer.toString('base64')}`;
                    fs.unlink(req.file.path, () => {});
                } catch (fallbackError) {
                    console.error('Fallback image base64 conversion failed:', fallbackError);
                }
            }
        }

        const updatedUser = await user.save({ validateBeforeSave: false });

        // Return plain object with all user data so the frontend
        // can immediately update the navbar and profile page
        res.status(200).json({
            success: true,
            data: updatedUser.toObject()
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update password
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // 1) Get user from collection
        const user = await User.findById(req.user.id).select('+password');

        // 2) Check if current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        // 3) Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.registerOfficer = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, role, matricule, jurisdiction } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        const newUser = await User.create({
            firstName,
            lastName,
            email,
            phone,
            password,
            role,
            matricule,
            jurisdiction,
            isVerified: true,
            status: 'active'
        });

        res.status(201).json({
            success: true,
            message: `${role} Registered Successfully`,
            data: newUser
        });
    } catch (err) {
        console.error('Officer Registration Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- ADMIN ONLY ---

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const filter = {};
        if (req.query.role) filter.role = req.query.role;
        
        // For recipient lookups, return only necessary identity fields to reduce payload size
        const isRecipientQuery = !req.query.role && req.path !== '/';
        const selectFields = isRecipientQuery
            ? 'firstName lastName email role profilePic status'
            : '-verificationCode -verificationCodeExpires -password -__v';
        const users = await User.find(filter).select(selectFields).lean();
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update any user (Admin)
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
