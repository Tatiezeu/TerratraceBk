const SystemConfig = require('../models/SystemConfig');
const sendEmail = require('../utils/email');
const { verificationEmail } = require('../utils/emailTemplates');

exports.getConfig = async (req, res) => {
    try {
        const configs = await SystemConfig.find();
        const configMap = {};
        configs.forEach(c => {
            configMap[c.key] = c.value;
        });
        res.status(200).json({
            success: true,
            data: configMap
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const { configs } = req.body;
        console.log('Updating configs:', configs);

        if (!configs || typeof configs !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid config data' });
        }

        const updatePromises = Object.entries(configs).map(async ([key, value]) => {
            console.log(`Attempting to save: ${key} = ${value}`);
            const updated = await SystemConfig.findOneAndUpdate(
                { key },
                { key, value },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`Saved successfully: ${updated.key} = ${updated.value}`);
            return updated;
        });

        await Promise.all(updatePromises);

        res.status(200).json({
            success: true,
            message: 'Configuration updated successfully'
        });
    } catch (err) {
        console.error('Config update error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.testEmail = async (req, res) => {
    try {
        const { email } = req.body;
        await sendEmail({
            email,
            subject: 'TerraTrace - SMTP Test',
            message: 'Your SMTP configuration is working correctly!',
            html: verificationEmail('123456')
        });
        res.status(200).json({ success: true, message: 'Test email sent' });
    } catch (err) {
        console.error('Test email error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
