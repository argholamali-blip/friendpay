// ui.js - UI Helpers and Modal Management for FriendPay

// =============================================================
// LOCAL STORAGE HELPERS (required by auth.js & dashboard.js)
// =============================================================

function saveAuthToken(token) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
}

function removeAuthToken() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
}

function saveUserData(user) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
}

function getUserData() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA));
    } catch {
        return null;
    }
}

function isLoggedIn() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
}

// Expose helpers globally so all modules can access them
window.saveAuthToken = saveAuthToken;
window.removeAuthToken = removeAuthToken;
window.saveUserData = saveUserData;
window.getUserData = getUserData;
window.isLoggedIn = isLoggedIn;

// =============================================================

/**
 * Shows a modal by ID
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Focus on first input if exists
        setTimeout(() => {
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
}

/**
 * Hides a modal by ID
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

/**
 * Shows an alert modal with custom message
 */
function showAlert(message, title = 'توجه') {
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    showModal('modal-alert');
}

/**
 * Switches between different views in the main app
 */
function switchView(viewName) {
    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNav = document.querySelector(`[data-view="${viewName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // Update view visibility
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    
    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) {
        activeView.classList.remove('hidden');
    }
    
    // Load data for specific views
    if (viewName === 'home') {
        loadDashboard();
    } else if (viewName === 'profile') {
        loadProfile();
    }
}

/**
 * Sets up navigation click handlers
 */
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            switchView(viewName);
        });
    });
}

/**
 * Sets up modal backdrop click handlers
 */
function setupModalBackdrops() {
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });
}

/**
 * Sets up Enter key handlers for forms
 */
function setupEnterKeyHandlers() {
    // Login form
    const loginInputs = ['login-phone', 'login-password'];
    loginInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        }
    });
    
    // Register form
    const registerInputs = ['register-phone', 'register-name', 'register-password'];
    registerInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleRegistration();
                }
            });
        }
    });
    
    // Invite form
    const inviteInputs = ['invite-phone', 'invite-amount', 'invite-description'];
    inviteInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSendInvitation();
                }
            });
        }
    });
}

/**
 * Shows a loading spinner in a container
 */
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="inline-block w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-gray-500">${CONFIG.MESSAGES.LOADING}</p>
            </div>
        `;
    }
}

/**
 * Shows empty state in a container
 */
function showEmptyState(containerId, icon, message, subMessage = '') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">${icon}</div>
                <p class="text-gray-500 mb-2">${message}</p>
                ${subMessage ? `<p class="text-sm text-gray-400">${subMessage}</p>` : ''}
            </div>
        `;
    }
}

/**
 * Formats number input to prevent negative values
 */
function setupNumberInputs() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.value < 0) {
                input.value = 0;
            }
        });
        
        // Prevent typing negative sign and 'e'
        input.addEventListener('keypress', (e) => {
            if (e.key === '-' || e.key === 'e' || e.key === '+') {
                e.preventDefault();
            }
        });
    });
}

/**
 * Formats phone input to auto-format as user types
 */
function setupPhoneInputs() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            // Remove all non-digits
            let value = e.target.value.replace(/\D/g, '');
            
            // Ensure it starts with 09
            if (value.length > 0 && !value.startsWith('09')) {
                if (value.startsWith('9')) {
                    value = '0' + value;
                } else if (!value.startsWith('0')) {
                    value = '09' + value;
                }
            }
            
            // Limit to 11 digits
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            
            e.target.value = value;
        });
    });
}

/**
 * Shows a toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-lg z-50 animate-fade-in`;
    
    if (type === 'success') {
        toast.className += ' bg-green-600 text-white';
    } else if (type === 'error') {
        toast.className += ' bg-red-600 text-white';
    } else {
        toast.className += ' bg-gray-800 text-white';
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * Sets up all UI event handlers
 */
function setupUIHandlers() {
    setupNavigation();
    setupModalBackdrops();
    setupEnterKeyHandlers();
    setupNumberInputs();
    setupPhoneInputs();
    
    // Close button for modals (ESC key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                hideModal(openModal.id);
            }
        }
    });
}

/**
 * Adds pull-to-refresh functionality (optional)
 */
function setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pulling = false;
    
    const mainElement = document.querySelector('main');
    
    if (!mainElement) return;
    
    mainElement.addEventListener('touchstart', (e) => {
        if (mainElement.scrollTop === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    });
    
    mainElement.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 0 && diff < 100) {
            e.preventDefault();
        }
    });
    
    mainElement.addEventListener('touchend', () => {
        if (!pulling) return;
        
        const diff = currentY - startY;
        if (diff > 80) {
            // Reload dashboard
            loadDashboard();
            showToast('در حال بروزرسانی...', 'info');
        }
        
        pulling = false;
        startY = 0;
        currentY = 0;
    });
}

console.log('UI Module Loaded');