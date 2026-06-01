const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { generateVerificationCode } = require('../utils/algorithm');
const bcrypt = require('bcryptjs');
const SystemConfig = require('../models/SystemConfig');
const sendEmail = require('../utils/email');
const { VerificationEmailTemplate, ActivationEmailTemplate } = require('../utils/emailTemplates');
const { verifyRecaptcha } = require('../utils/recaptcha');

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
        let { firstName, lastName, email, phone, cniNumber, gender, dob, password, role, profilePic, recaptchaToken } = req.body;

        // Clean up empty optional fields to prevent Mongoose validation failures
        if (cniNumber === "") cniNumber = undefined;
        if (gender === "") gender = undefined;
        if (dob === "") dob = undefined;

        // Validate reCAPTCHA v3 if token is provided
        if (recaptchaToken) {
            const verification = await verifyRecaptcha(recaptchaToken, 'signup', req.ip);
            if (!verification.success) {
                return res.status(400).json({ success: false, message: verification.message });
            }
            if (verification.score < 0.3) {
                return res.status(403).json({
                    success: false,
                    message: "Registration blocked due to suspicious automated activity signatures."
                });
            }
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Generate cryptographically secure activation token
        const crypto = require('crypto');
        const rawToken = crypto.randomBytes(32).toString('hex');
        const activationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

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
            profilePic,
            activationToken,
            activationTokenExpires,
            isVerified: false,
            status: 'pending'
        });

        // Send activation email via email
        try {
            const os = require('os');
            let localIp = 'localhost';
            const interfaces = os.networkInterfaces();
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (!iface.internal && iface.family === 'IPv4') {
                        localIp = iface.address;
                        break;
                    }
                }
                if (localIp !== 'localhost') break;
            }

            let frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
            if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
                frontendUrl = frontendUrl.replace('localhost', localIp).replace('127.0.0.1', localIp);
            }

            const activationLink = `${frontendUrl}/activate?token=${rawToken}`;
            await sendEmail({
                email: newUser.email,
                subject: 'TerraTrace - Activate Your Account',
                message: `Please activate your account by visiting: ${activationLink}`,
                html: ActivationEmailTemplate(activationLink, `${newUser.firstName} ${newUser.lastName}`)
            });
        } catch (err) {
            console.error('Email sending failed:', err);
        }

        res.status(201).json({
            success: true,
            message: 'Activation link sent to your email',
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
        const { email, password, twoFactorCode, recaptchaToken } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // Validate reCAPTCHA v3 if token is present
        let forceTwoFactor = false;
        if (recaptchaToken) {
            const verification = await verifyRecaptcha(recaptchaToken, 'login', req.ip);
            if (!verification.success) {
                return res.status(400).json({ success: false, message: verification.message });
            }

            const score = verification.score;
            if (score < 0.3) {
                // Tier 3: Block obvious bots (0.0 - 0.2)
                return res.status(403).json({
                    success: false,
                    message: "Access blocked due to suspicious automated activity signatures."
                });
            } else if (score < 0.7) {
                // Tier 2: Suspicious scores (0.3 - 0.6) - force MFA / Two-Factor verification
                forceTwoFactor = true;
                console.log(`Suspicious score (${score}) detected. Forcing 2FA email verification.`);
            }
            // Tier 1: High scores (0.7 - 1.0) proceed seamlessly.
        }

        const user = await User.findOne({ email }).select('+password +verificationCode +verificationCodeExpires');
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Incorrect email or password' });
        }

        // Check if account is suspended
        if (user.status === 'suspended') {
            return res.status(401).json({ 
                success: false, 
                message: 'Your account has been suspended. Please contact the administrator.' 
            });
        }

        // Check if account is inactive / pending verification
        if (user.status === 'pending' || !user.isVerified) {
            return res.status(401).json({
                success: false,
                message: 'Your account is inactive. Please click the activation link in your email to activate it.'
            });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const timeDifference = user.lockUntil - Date.now();
            const minutesLeft = Math.ceil(timeDifference / (60 * 1000));
            const secondsLeft = Math.ceil(timeDifference / 1000);
            
            let timeMessage = `${minutesLeft} minute(s)`;
            if (secondsLeft < 60) {
                timeMessage = `${secondsLeft} second(s)`;
            }
            
            return res.status(401).json({ 
                success: false, 
                message: `Your account is temporarily locked due to successive login failures. Please try again in ${timeMessage}.` 
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

        // Handle 2FA (or forced 2FA for suspicious scores)
        if (user.twoFactorEnabled || forceTwoFactor) {
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
                        html: VerificationEmailTemplate(code)
                    });
                } catch (err) {
                    console.error('2FA Email sending failed:', err);
                }

                return res.status(200).json({
                    success: true,
                    twoFactorRequired: true,
                    message: forceTwoFactor 
                        ? 'Suspicious browser activity detected. Two-factor verification code sent to your email.'
                        : '2FA code sent to your email'
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

exports.resendCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Send email
        try {
            if (!user.isVerified) {
                // Generate a fresh activation token
                const crypto = require('crypto');
                const rawToken = crypto.randomBytes(32).toString('hex');
                const activationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
                const activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

                user.activationToken = activationToken;
                user.activationTokenExpires = activationTokenExpires;
                await user.save();

                const os = require('os');
                let localIp = 'localhost';
                const interfaces = os.networkInterfaces();
                for (const name of Object.keys(interfaces)) {
                    for (const iface of interfaces[name]) {
                        if (!iface.internal && iface.family === 'IPv4') {
                            localIp = iface.address;
                            break;
                        }
                    }
                    if (localIp !== 'localhost') break;
                }

                let frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
                if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
                    frontendUrl = frontendUrl.replace('localhost', localIp).replace('127.0.0.1', localIp);
                }

                const activationLink = `${frontendUrl}/activate?token=${rawToken}`;
                await sendEmail({
                    email: user.email,
                    subject: 'TerraTrace - Activate Your Account',
                    message: `Please activate your account by visiting: ${activationLink}`,
                    html: ActivationEmailTemplate(activationLink, `${user.firstName} ${user.lastName}`)
                });
            } else {
                // If verified, standard 2FA code is sent
                const verificationCode = generateVerificationCode();
                const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

                user.verificationCode = verificationCode;
                user.verificationCodeExpires = verificationCodeExpires;
                await user.save();

                await sendEmail({
                    email: user.email,
                    subject: 'TerraTrace - 2FA Verification',
                    message: `Your 2FA verification code is: ${verificationCode}`,
                    html: VerificationEmailTemplate(verificationCode)
                });
            }
        } catch (err) {
            console.error('Email resending failed:', err);
            return res.status(500).json({ success: false, message: 'Failed to send email' });
        }

        res.status(200).json({
            success: true,
            message: 'New verification code sent to your email'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.activateAccount = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Activation token is missing' });
        }

        const crypto = require('crypto');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            activationToken: hashedToken,
            activationTokenExpires: { $gt: Date.now() }
        }).select('+activationToken +activationTokenExpires');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid, expired or already used activation token' });
        }

        // Activate user
        user.isVerified = true;
        user.status = 'active';
        user.activationToken = undefined;
        user.activationTokenExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Your account has been successfully activated!'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
