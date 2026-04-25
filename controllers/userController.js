const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get current user profile
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({
            success: true,
            data: user
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

        // Filter out fields that shouldn't be updated directly
        const filteredBody = {};
        const allowedFields = ['firstName', 'lastName', 'phone'];
        allowedFields.forEach(el => {
            if (req.body[el]) filteredBody[el] = req.body[el];
        });

        // Handle profile picture upload
        if (req.file) {
            filteredBody.profilePic = `/uploads/${req.file.filename}`;
        }

        const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: updatedUser
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
        
        const users = await User.find(filter).select('-verificationCode -verificationCodeExpires');
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
