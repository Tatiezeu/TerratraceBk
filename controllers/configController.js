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

// Ordered fallback chain — all confirmed generateContent models on this key
const GEMINI_TEST_FALLBACKS = [
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite-001',
    'gemini-2.0-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
];

exports.testChatbot = async (req, res) => {
    try {
        const { apiKey, provider, model, projectNumber } = req.body;
        if (!apiKey) {
            return res.status(400).json({ success: false, message: 'API key is required' });
        }

        const isGemini = (provider || '').toLowerCase().includes('gemini');

        if (isGemini) {
            const headers = { 'Content-Type': 'application/json' };
            if (projectNumber) headers['x-goog-user-project'] = projectNumber;

            const primaryModel = model || 'gemini-flash-latest';
            const modelsToTry = [
                primaryModel,
                ...GEMINI_TEST_FALLBACKS.filter(m => m !== primaryModel)
            ];

            for (const modelId of modelsToTry) {
                for (let attempt = 0; attempt <= 2; attempt++) {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
                    try {
                        const response = await fetch(url, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: 'Hello! Respond with a friendly greeting in under 10 words.' }] }]
                            })
                        });
                        const data = await response.json();

                        if (response.ok) {
                            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Connected!';
                            return res.status(200).json({
                                success: true,
                                message: `✅ Connection Successful (${modelId})! AI says: "${replyText.trim()}"`
                            });
                        }

                        const code = data.error?.code;
                        // 503: busy — retry with backoff
                        if (code === 503 && attempt < 2) {
                            await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
                            continue;
                        }
                        // 429/404/503-exhausted: try next model
                        if (code === 429 || code === 404 || code === 503) break;

                        // Auth/permanent error: fail immediately
                        return res.status(400).json({ success: false, message: data.error?.message || 'Gemini connection failed' });

                    } catch (fetchErr) {
                        // Network-level error (ECONNRESET, DNS, socket timeout)
                        console.warn(`⚠️ Network error on ${modelId} attempt ${attempt + 1}: ${fetchErr.message}`);
                        if (attempt < 2) {
                            await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
                            continue;
                        }
                        break; // try next model
                    }
                }
            }

            return res.status(503).json({ success: false, message: 'All Gemini models are temporarily busy. Your key is valid — please try again in a few seconds.' });

        } else {
            const modelId = model || 'gpt-4o-mini';
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: 'user', content: 'Hello, is this key working? Keep response under 10 words.' }]
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'OpenAI connection failed');
            }
            const replyText = data.choices?.[0]?.message?.content || 'No response text';
            return res.status(200).json({
                success: true,
                message: `✅ Connection Successful! OpenAI says: "${replyText.trim()}"`
            });
        }
    } catch (err) {
        console.error('Chatbot test error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
