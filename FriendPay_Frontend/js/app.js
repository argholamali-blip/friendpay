// js/app.js - Main App Initialization

/**
 * Sets up all PWA features (service worker, install prompt, etc.)
 */
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully.');
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        console.log('PWA install prompt available');
    });
}

/**
 * Handles online/offline status notifications.
 */
function setupConnectionHandlers() {
    window.addEventListener('online', () => {
        if (typeof showAlert === 'function') {
            showAlert('اتصال به اینترنت برقرار شد.', 'آنلاین');
        }
        if (typeof loadDashboard === 'function' && window.isLoggedIn()) {
             window.loadDashboard();
        }
    });
    
    window.addEventListener('offline', () => {
        if (typeof showAlert === 'function') {
            showAlert('اتصال اینترنت قطع شد. در حالت آفلاین هستید.', 'آفلاین');
        }
    });
}

/**
 * Sets up error handling.
 */
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Global JS error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise rejection:', event.reason);
    });
}

/**
 * Initializes the application by setting up event listeners and checking auth status.
 */
function initApp() {
    console.log('Initializing FriendPay...');
    
    // --- 1. SETUP CORE SERVICES ---
    setupPWA();
    setupConnectionHandlers();
    setupErrorHandling();
    
    // --- 2. ATTACH EVENT LISTENERS (CRITICAL FIX) ---
    // We attach the handlers directly from the window object.
    
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Ensure handlers are attached only if they exist on the window object (meaning auth.js loaded)
    if (registerBtn && typeof window.handleRegistration === 'function') {
        registerBtn.addEventListener('click', window.handleRegistration);
    }
    if (loginBtn && typeof window.handleLogin === 'function') {
        loginBtn.addEventListener('click', window.handleLogin);
    }
    if (logoutBtn && typeof window.handleLogout === 'function') {
        logoutBtn.addEventListener('click', window.handleLogout);
    }

    // Auth Screen Switch Handlers are handled via onclick attributes in HTML (showAuthScreen is globally exposed by auth.js)

    // Navigation (already correct, assumes classes are on nav-item)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`view-${viewName}`).classList.remove('hidden');
        });
    });
    
    // --- 3. CHECK AUTH STATUS AND DISPLAY UI ---
    if (typeof window.isLoggedIn === 'function' && window.isLoggedIn()) {
        window.showMainApp();
    } else {
        window.showAuthScreen('login');
    }
    
    console.log('FriendPay Initialized Successfully!');
}


// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);