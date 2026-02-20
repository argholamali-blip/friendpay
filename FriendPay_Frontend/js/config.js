// config.js - Configuration file for FriendPay

// API Configuration
const CONFIG = {
    // ▼ PRODUCTION: Railway backend URL
    PRODUCTION_API_URL: 'https://friendpay-production.up.railway.app/api',

    API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : 'https://friendpay-production.up.railway.app/api',
    
    // App Configuration
    APP_NAME: 'FriendPay',
    APP_VERSION: '1.0.0',
    
    // Local Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'friendpay_token',
        USER_DATA: 'friendpay_user'
    },
    
    // API Endpoints - FIXED to match backend
    ENDPOINTS: {
        // Auth endpoints
        LOGIN: '/users/login',
        REGISTER: '/users/register',
        
        // User endpoints
        DASHBOARD: '/users/dashboard',
        SEND_INVITATION: '/users/send-link',  // FIXED: was '/debts/invite'
        
        // Payment endpoints
        SETTLE_DEBT: '/payments/settle',
        PAYMENT_HISTORY: '/payments/history',
        
        // OCR endpoints
        SCAN_RECEIPT: '/ocr/scan',
        
        // Group endpoints
        GROUPS_LIST: '/groups',
        CREATE_GROUP: '/groups/create'
    },
    
    // UI Configuration
    CURRENCY_SYMBOL: 'ت',
    CURRENCY_NAME: 'تومان',
    
    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
    
    // Default messages
    MESSAGES: {
        LOADING: 'در حال بارگذاری...',
        ERROR_NETWORK: 'خطا در ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی کنید.',
        ERROR_UNKNOWN: 'خطای ناشناخته رخ داده است',
        ERROR_TIMEOUT: 'زمان درخواست به پایان رسید',
        SUCCESS_LOGIN: 'ورود موفق',
        SUCCESS_REGISTER: 'ثبت‌نام موفق',
        SUCCESS_INVITE: 'دعوتنامه ارسال شد',
        SUCCESS_SETTLE: 'تسویه حساب انجام شد',
        ERROR_INVALID_CREDENTIALS: 'شماره موبایل یا رمز عبور اشتباه است',
        ERROR_USER_EXISTS: 'این شماره موبایل قبلا ثبت شده است'
    },
    
    // Validation
    PHONE_REGEX: /^09\d{9}$/,
    MIN_PASSWORD_LENGTH: 6
};

// Make CONFIG globally available
window.CONFIG = CONFIG;

// Debug log in development
if (CONFIG.API_BASE_URL.includes('localhost')) {
    console.log('🔧 FriendPay Config (Development Mode)');
    console.log('API:', CONFIG.API_BASE_URL);
}