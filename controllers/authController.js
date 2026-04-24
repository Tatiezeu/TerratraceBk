const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { generateVerificationCode } = require('../utils/algorithm');
const bcrypt = require('bcryptjs');
const SystemConfig = require('../models/SystemConfig');
const sendEmail = require('../utils/email');
const { verificationEmail } = require('../utils/emailTemplates');

// Sign token
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Create and send token
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    user.password = undefined; // Hide password

    res.status(statusCode).json({
        success: true,
        token,
        data: {
            user
        }
    });
};

exports.signup = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, cniNumber, gender, dob, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        const newUser = await User.create({
            firstName,
            lastName,
            email,
            phone,
            cniNumber,
            gender,
            dob,
            password,
            role,
            verificationCode,
            verificationCodeExpires
        });

        // Send verification code via email
        try {
            await sendEmail({
                email: newUser.email,
                subject: 'TerraTrace - Email Verification',
                message: `Your verification code is: ${verificationCode}`,
                html: verificationEmail(verificationCode)
            });
        } catch (err) {
            console.error('Email sending failed:', err);
        }

        res.status(201).json({
            success: true,
            message: 'Verification code sent to your email',
            email: newUser.email
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        const user = await User.findOne({ 
            email, 
            verificationCode: code,
            verificationCodeExpires: { $gt: Date.now() }
        }).select('+verificationCode +verificationCodeExpires');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }

        user.isVerified = true;
        user.status = 'active';
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        createSendToken(user, 200, res);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, twoFactorCode } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password +verificationCode +verificationCodeExpires');
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Incorrect email or password' });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
            return res.status(401).json({ 
                success: false, 
                message: `Account is locked. Try again in ${remainingMinutes} minutes.` 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password, user.password);
        
        if (!isMatch) {
            // Increment login attempts
            user.loginAttempts += 1;
            
            // Get config for max attempts
            const maxAttemptsConfig = await SystemConfig.findOne({ key: 'maxLoginAttempts' });
            const lockDurationConfig = await SystemConfig.findOne({ key: 'lockoutDuration' });
            
            const maxAttempts = maxAttemptsConfig ? parseInt(maxAttemptsConfig.value) : 5;
            const lockDuration = lockDurationConfig ? parseInt(lockDurationConfig.value) : 30; // minutes

            if (user.loginAttempts >= maxAttempts) {
                user.lockUntil = Date.now() + lockDuration * 60 * 1000;
                user.loginAttempts = 0; // Reset attempts for next session
                await user.save();
                return res.status(401).json({ 
                    success: false, 
                    message: `Too many failed attempts. Account locked for ${lockDuration} minutes.` 
                });
            }

            await user.save();
            return res.status(401).json({ success: false, message: 'Incorrect email or password' });
        }

        // Check if verified
        if (!user.isVerified) {
            return res.status(401).json({ success: false, message: 'Account not verified. Please verify your email.' });
        }

        // Handle 2FA
        if (user.twoFactorEnabled) {
            if (!twoFactorCode) {
                // Generate and send 2FA code
                const code = generateVerificationCode();
                user.verificationCode = code;
                user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
                await user.save();

                // Send code via email
                try {
                    await sendEmail({
                        email: user.email,
                        subject: 'TerraTrace - 2FA Verification',
                        message: `Your 2FA verification code is: ${code}`,
                        html: verificationEmail(code)
                    });
                } catch (err) {
                    console.error('2FA Email sending failed:', err);
                }

                return res.status(200).json({
                    success: true,
                    twoFactorRequired: true,
                    message: '2FA code sent to your email'
                });
            }

            // Verify 2FA code
            if (user.verificationCode !== twoFactorCode || user.verificationCodeExpires < Date.now()) {
                return res.status(400).json({ success: false, message: 'Invalid or expired 2FA code' });
            }

            // Clear 2FA code
            user.verificationCode = undefined;
            user.verificationCodeExpires = undefined;
        }

        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        createSendToken(user, 200, res);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
