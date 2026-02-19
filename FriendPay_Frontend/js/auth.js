// auth.js - Authentication handlers for FriendPay

/**
 * Handles user registration
 */
async function handleRegistration() {
    const phone = document.getElementById('register-phone').value.trim();
    const name = document.getElementById('register-name').value.trim();
    const password = document.getElementById('register-password').value;

    // Validation
    if (!phone || !name || !password) {
        return showAlert('لطفاً همه فیلدها را پر کنید.', 'خطای فرم');
    }

    // Validate phone number format (Iranian)
    if (!/^09\d{9}$/.test(phone)) {
        return showAlert('شماره موبایل باید با 09 شروع شود و 11 رقم باشد.', 'خطای فرم');
    }

    if (password.length < 6) {
        return showAlert('رمز عبور باید حداقل 6 کاراکتر باشد.', 'خطای فرم');
    }

    // Get deep link token if exists (for invite flow)
    const urlParams = new URLSearchParams(window.location.search);
    const deepLinkToken = urlParams.get('token');

    // Disable button and show loading
    const registerBtn = document.getElementById('register-btn');
    const originalText = registerBtn.textContent;
    registerBtn.disabled = true;
    registerBtn.textContent = 'در حال ثبت‌نام...';

    try {
        const result = await API.register(phone, name, password, deepLinkToken);

        // Save token and user data
        saveAuthToken(result.token);
        // Backend returns fields directly (not nested under result.user)
        const userData = result.user || { fullName: result.fullName, phoneNumber: result.phoneNumber || phone, id: result.userId };
        saveUserData(userData);

        // Clear form
        document.getElementById('register-phone').value = '';
        document.getElementById('register-name').value = '';
        document.getElementById('register-password').value = '';

        // Show success message and navigate to main app
        showAlert('حساب شما با موفقیت ایجاد شد!', 'خوش آمدید');
        setTimeout(() => {
            showMainApp();
        }, 1500);

    } catch (error) {
        showAlert(error.message || 'خطا در ثبت نام. لطفاً دوباره تلاش کنید.', 'خطا');
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = originalText;
    }
}

/**
 * Handles user login
 */
async function handleLogin() {
    const phoneNumber = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;

    // Validation
    if (!phoneNumber || !password) {
        return showAlert('شماره موبایل و رمز عبور الزامی است.', 'خطای فرم');
    }

    // Validate phone number format
    if (!/^09\d{9}$/.test(phoneNumber)) {
        return showAlert('فرمت شماره موبایل صحیح نیست.', 'خطای فرم');
    }

    // Disable button and show loading
    const loginBtn = document.getElementById('login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = 'در حال ورود...';

    try {
        const result = await API.login(phoneNumber, password);

        // Save token and user data
        saveAuthToken(result.token);
        // Backend returns fields directly (not nested under result.user)
        const userData = result.user || { fullName: result.fullName, phoneNumber: result.phoneNumber || phoneNumber, id: result.userId };
        saveUserData(userData);

        // Clear form
        document.getElementById('login-phone').value = '';
        document.getElementById('login-password').value = '';

        // Show success message and navigate to main app
        showAlert(result.message || CONFIG.MESSAGES.SUCCESS_LOGIN, 'ورود موفق');
        setTimeout(() => {
            showMainApp();
        }, 1000);

    } catch (error) {
        showAlert(error.message || 'خطا در ورود. لطفاً دوباره تلاش کنید.', 'خطا');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
    }
}

/**
 * Handles user logout
 */
function handleLogout() {
    if (confirm('آیا مطمئن هستید که می‌خواهید خارج شوید؟')) {
        removeAuthToken();
        sessionStorage.clear();
        window.location.href = window.location.pathname;
    }
}

/**
 * Shows authentication screen (login or register)
 */
function showAuthScreen(screen) {
    console.log('Switching to auth screen:', screen);
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('main-app').style.display = 'none';

    document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`auth-${screen}`);
    if (target) {
        target.classList.add('active');
    } else {
        console.warn(`Auth screen not found: auth-${screen}`);
    }
}

/**
 * Shows the main app (after successful login/register)
 */
function showMainApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';

    // Load dashboard and profile data
    loadDashboard();
    loadProfile();
}

/**
 * Checks authentication status on page load
 */
function checkAuthStatus() {
    if (isLoggedIn()) {
        showMainApp();
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('token')) {
            showAuthScreen('register');
            showAlert('لطفاً ثبت‌نام کنید تا بدهی ثبت شود.', 'دعوتنامه دریافت شد');
        } else {
            showAuthScreen('login');
        }
    }
}

// ------------------------------------------------------------------
// SAFETY PATCH: Prevent checkAuthStatus() from overriding manual clicks
// ------------------------------------------------------------------
let manualSwitch = false;

// Keep original versions
const _showAuthScreen = showAuthScreen;
const _checkAuthStatus = checkAuthStatus;

// Override showAuthScreen to mark manual user actions
showAuthScreen = function(screen) {
    manualSwitch = true;
    _showAuthScreen(screen);
};

// Override checkAuthStatus to ignore if user has switched manually
checkAuthStatus = function() {
    if (manualSwitch) {
        console.log('Manual auth screen switch detected — skipping checkAuthStatus');
        return;
    }
    _checkAuthStatus();
};

// Make sure both functions are globally accessible
window.showAuthScreen = showAuthScreen;
window.checkAuthStatus = checkAuthStatus;
window.handleLogin = handleLogin;
window.handleRegistration = handleRegistration;
window.handleLogout = handleLogout;
window.showMainApp = showMainApp;

console.log('✅ Auth Module Loaded');