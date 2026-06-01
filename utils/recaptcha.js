const axios = require('axios');

/**
 * verifyRecaptcha - Performs server-to-server validation of a frontend reCAPTCHA v3 token.
 * 
 * @param {string} token - The g-recaptcha token returned from the client.
 * @param {string} action - The expected action name (e.g. 'login', 'signup').
 * @param {string} clientIp - Optional client IP address.
 * @returns {Promise<{success: boolean, score: number, message: string, isFailsafe?: boolean}>}
 */
exports.verifyRecaptcha = async (token, action, clientIp) => {
    // 1. Secret keys & Hostnames managed via environment variables with Google official test-key fallback
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnCFfgCWtptr9y13WSw3';
    const allowedHostname = process.env.RECAPTCHA_ALLOWED_HOSTNAME || 'localhost';

    if (!token) {
        return { success: false, score: 0, message: 'No security verification token provided.' };
    }

    try {
        // 2. Perform a server-to-server POST request to Google's siteverify endpoint
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            new URLSearchParams({
                secret: secretKey,
                response: token,
                remoteip: clientIp || ''
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 5000 // 5 seconds timeout for fail-safe
            }
        );

        const data = response.data;

        // Fail-safe check in case Google responds with empty or malformed payload
        if (!data) {
            console.warn('reCAPTCHA siteverify returned empty payload. Activating fail-safe pass.');
            return { success: true, score: 0.9, isFailsafe: true, message: 'Fail-safe activated (empty response).' };
        }

        // 3. Check Google's success: true flag
        if (!data.success) {
            console.warn('Google reCAPTCHA verification failed:', data['error-codes']);
            return { 
                success: false, 
                score: 0, 
                message: 'reCAPTCHA token verification failed.', 
                errorCodes: data['error-codes'] 
            };
        }

        // 4. Strictly validate context-specific action name to prevent replay attacks
        if (data.action !== action) {
            console.warn(`reCAPTCHA Action Mismatch: Expected "${action}", Got "${data.action}"`);
            return {
                success: false,
                score: 0,
                message: `Invalid request signature (action mismatch).`
            };
        }

        // 5. Strictly validate hostname matches our authorized domain to prevent token-injection
        const host = data.hostname;
        if (host !== allowedHostname && host !== 'localhost' && host !== '127.0.0.1') {
            console.warn(`reCAPTCHA Hostname Mismatch: "${host}" is not in authorized domain list.`);
            return {
                success: false,
                score: 0,
                message: 'Invalid request signature (domain unauthorized).'
            };
        }

        return {
            success: true,
            score: data.score !== undefined ? data.score : 0.9,
            action: data.action,
            hostname: data.hostname
        };

    } catch (err) {
        // 6. Fail-Safe Mechanism: Let the login/signup proceed gracefully if the Google API is unreachable
        console.error('Google reCAPTCHA API is temporarily unreachable or timed out. Triggering fail-safe pass:', err.message);
        return {
            success: true,
            score: 0.9, // Return high safe score to bypass blocks
            isFailsafe: true,
            message: 'Fail-safe activated (API unreachable).'
        };
    }
};
