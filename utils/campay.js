const axios = require('axios');

class CamPayClient {
    /**
     * @param {Object} config 
     * @param {string} config.campay_app_key
     * @param {string} config.campay_password
     * @param {string} config.campay_env - 'sandbox' or 'live'
     */
    constructor(config) {
        this.config = config;
        this.isMock = !config.campay_app_key || config.campay_app_key === 'mock' || config.campay_app_key.trim() === '';
        this.baseUrl = config.campay_env === 'live' ? 'https://www.campay.net/api' : 'https://demo.campay.net/api';
    }

    /**
     * Exchanges credentials for a temporary access token.
     */
    async getAccessToken() {
        if (this.isMock) {
            return 'mock-token';
        }
        try {
            const response = await axios.post(`${this.baseUrl}/token/`, {
                username: this.config.campay_app_key,
                password: this.config.campay_password
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });
            return response.data.token;
        } catch (err) {
            console.error('CamPay Token Request Error:', err.response?.data || err.message);
            throw new Error(`CamPay authentication failed: ${err.response?.data?.detail || err.message}`);
        }
    }

    /**
     * Initiates payment collection via USSD push.
     */
    async collect(params) {
        if (this.isMock || (params.phone && params.phone.includes('600000000'))) {
            console.log(`[CamPay MOCK] Initiating collection: XAF ${params.amount} from ${params.phone}`);
            return {
                reference: 'MOCK-COLL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
                status: 'PENDING'
            };
        }

        try {
            const token = await this.getAccessToken();
            const response = await axios.post(`${this.baseUrl}/collect/`, {
                amount: params.amount.toString(),
                currency: 'XAF',
                from: params.phone,
                description: params.description || 'TerraTrace Escrow Deposit',
                external_reference: params.externalReference
            }, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });
            return response.data;
        } catch (err) {
            console.error('CamPay Collect Request Error:', err.response?.data || err.message);
            throw new Error(`CamPay collection failed: ${JSON.stringify(err.response?.data) || err.message}`);
        }
    }

    /**
     * Retrieves status of a specific transaction by reference ID.
     */
    async getTransactionStatus(reference) {
        if (this.isMock || reference.startsWith('MOCK-')) {
            console.log(`[CamPay MOCK] Checking status for reference: ${reference}`);
            return {
                reference,
                status: 'SUCCESSFUL' // Always succeed in mock mode
            };
        }

        try {
            const token = await this.getAccessToken();
            const response = await axios.get(`${this.baseUrl}/transaction/${reference}/`, {
                headers: {
                    'Authorization': `Token ${token}`
                },
                timeout: 10000
            });
            return response.data;
        } catch (err) {
            console.error('CamPay Status Check Error:', err.response?.data || err.message);
            throw new Error(`CamPay status check failed: ${err.response?.data?.detail || err.message}`);
        }
    }

    /**
     * Transfers money to a client/registered MoMo wallet (withdraw/payout).
     */
    async withdraw(params) {
        if (this.isMock) {
            console.log(`[CamPay MOCK] Processing payout: XAF ${params.amount} to ${params.phone}`);
            return {
                reference: 'MOCK-WD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
                status: 'SUCCESSFUL'
            };
        }

        try {
            const token = await this.getAccessToken();
            const response = await axios.post(`${this.baseUrl}/withdraw/`, {
                amount: params.amount.toString(),
                to: params.phone,
                from: params.phone,
                currency: 'XAF',
                description: params.description || 'TerraTrace Escrow Release',
                external_reference: params.externalReference
            }, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });
            return response.data;
        } catch (err) {
            console.error('CamPay Withdraw/Payout Error:', err.response?.data || err.message);
            throw new Error(`CamPay payout failed: ${JSON.stringify(err.response?.data) || err.message}`);
        }
    }
}

module.exports = CamPayClient;
