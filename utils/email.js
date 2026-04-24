const nodemailer = require('nodemailer');
const SystemConfig = require('../models/SystemConfig');
const path = require('path');

const sendEmail = async (options) => {
    // 1) Get email configuration from database
    const allConfigs = await SystemConfig.find();
    console.log('--- ALL SYSTEM CONFIGS ---');
    allConfigs.forEach(c => console.log(`${c.key}: ${c.value}`));
    console.log('--------------------------');

    const smtpHost = await SystemConfig.findOne({ key: 'smtpHost' });
    const smtpPort = await SystemConfig.findOne({ key: 'smtpPort' });
    const smtpUser = await SystemConfig.findOne({ key: 'smtpUser' });
    const smtpPass = await SystemConfig.findOne({ key: 'smtpPass' });
    const senderEmail = await SystemConfig.findOne({ key: 'senderEmail' });

    console.log('--- Email Config Debug ---');
    console.log('Host:', smtpHost ? smtpHost.value : 'DEFAULT');
    console.log('Port:', smtpPort ? smtpPort.value : 'DEFAULT');
    console.log('User:', smtpUser ? smtpUser.value : 'DEFAULT');
    console.log('--------------------------');

    // 2) Create a transporter
    const transporter = nodemailer.createTransport({
        host: (smtpHost && smtpHost.value) ? smtpHost.value : (process.env.EMAIL_HOST || 'smtp.gmail.com'),
        port: (smtpPort && smtpPort.value) ? smtpPort.value : (process.env.EMAIL_PORT || 587),
        secure: (smtpPort && smtpPort.value) == 465, // true for 465, false for other ports
        auth: {
            user: (smtpUser && smtpUser.value) ? smtpUser.value : process.env.EMAIL_USER,
            pass: (smtpPass && smtpPass.value) ? smtpPass.value : process.env.EMAIL_PASS
        }
    });

    // 3) Define the email options
    const mailOptions = {
        from: `TerraTrace <${(senderEmail && senderEmail.value) ? senderEmail.value : (process.env.EMAIL_FROM || 'no-reply@terratrace.cm')}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
        attachments: [{
            filename: 'logo.svg',
            path: path.join(__dirname, '../assets/logo.svg'),
            cid: 'logo'
        }]
    };

    // 4) Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
