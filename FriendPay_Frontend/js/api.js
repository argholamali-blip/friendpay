// api.js - API helper functions with improved error handling

const API = {
    // Base fetch wrapper with timeout and error handling
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...options
        };

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                ...defaultOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Parse response
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 401) {
                    // Token expired or invalid - logout user
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
                    
                    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                        window.location.href = 'index.html';
                    }
                }
                
                throw new Error(data.message || `HTTP Error: ${response.status}`);
            }

            return data;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(CONFIG.MESSAGES.ERROR_TIMEOUT);
            }

            if (!navigator.onLine) {
                throw new Error('اتصال اینترنت برقرار نیست');
            }

            throw error;
        }
    },

    // Auth APIs
    async login(phoneNumber, password) {
        return this.request(CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ phoneNumber, password })
        });
    },

    async register(phoneNumber, fullName, password, deepLinkToken) {
        return this.request(CONFIG.ENDPOINTS.REGISTER, {
            method: 'POST',
            body: JSON.stringify({ 
                phoneNumber, 
                fullName, 
                password,
                deepLinkToken: deepLinkToken || 'placeholder'
            })
        });
    },

    // User APIs
    async getDashboard() {
        return this.request(CONFIG.ENDPOINTS.DASHBOARD, {
            method: 'GET'
        });
    },

    async sendInvitation(inviteePhoneNumber, debtAmount, billDescription) {
        return this.request(CONFIG.ENDPOINTS.SEND_INVITATION, {
            method: 'POST',
            body: JSON.stringify({ 
                inviteePhoneNumber, 
                debtAmount, 
                billDescription 
            })
        });
    },

    // Payment APIs
    async settleDebt(friendId, amount, description) {
        return this.request(CONFIG.ENDPOINTS.SETTLE_DEBT, {
            method: 'POST',
            // Backend expects 'debtToId', not 'friendId'
            body: JSON.stringify({ debtToId: friendId, amount, description })
        });
    },

    async getPaymentHistory() {
        return this.request(CONFIG.ENDPOINTS.PAYMENT_HISTORY, {
            method: 'GET'
        });
    },

    // Find user by phone number
    async findByPhone(phoneNumber) {
        return this.request('/users/find-by-phone', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber })
        });
    },

    // OCR: send base64 image to backend → Gemini 2.0 Flash
    async scanReceipt(imageBase64, mimeType = 'image/jpeg') {
        return this.request('/ocr/process-receipt', {
            method: 'POST',
            body: JSON.stringify({ imageBase64, mimeType })
        });
    }
};

// Make API globally available
window.API = API;

console.log('✅ API Module Loaded');