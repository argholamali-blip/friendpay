// dashboard.js - Dashboard and Friends Management for FriendPay

/**
 * Current friend being interacted with (for settle modal)
 */
let currentFriend = null;

/**
 * Formats numbers to Persian/Farsi format with thousand separators
 */
function formatToman(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '۰';
    return Math.abs(Math.round(amount)).toLocaleString('fa-IR');
}

/**
 * Gets user initials from full name
 */
function getInitials(fullName) {
    if (!fullName) return 'U';
    const words = fullName.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Loads dashboard data including balances and friends list
 */
async function loadDashboard() {
    try {
        const data = await API.getDashboard();
        
        if (!data) return;
        
        // Update user name display
        if (data.user && data.user.fullName) {
            document.getElementById('user-name-display').textContent = data.user.fullName;
            saveUserData(data.user);
        }
        
        // Update balance cards
        const youOwe = data.user?.totalYouOwe || 0;
        const owedToYou = data.user?.totalOwedToYou || 0;
        
        document.getElementById('dashboard-you-owe').innerHTML = 
            `${formatToman(youOwe)} <span class="text-lg">ت</span>`;
        document.getElementById('dashboard-owed-to-you').innerHTML = 
            `${formatToman(owedToYou)} <span class="text-lg">ت</span>`;
        
        // Load friends list
        loadFriendsList(data.friendBalances || []);
        
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showAlert(error.message || 'خطا در بارگذاری داشبورد.', 'خطا');
    }
}

/**
 * Loads and displays friends list
 */
function loadFriendsList(friendBalances) {
    const container = document.getElementById('friends-list-container');
    
    if (!friendBalances || friendBalances.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">👥</div>
                <p class="text-gray-500 mb-2">هنوز دوستی اضافه نکرده‌اید</p>
                <p class="text-sm text-gray-400">از دکمه + برای دعوت دوستان استفاده کنید</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = friendBalances.map(friend => {
        const balance = friend.balance || 0;
        const isDebt = balance < 0; // Negative means you owe them
        const displayAmount = formatToman(Math.abs(balance));
        
        let statusColor, statusText, statusBg;
        
        if (balance === 0) {
            statusColor = 'text-gray-600';
            statusText = 'تسویه شده';
            statusBg = 'bg-gray-50';
        } else if (isDebt) {
            statusColor = 'text-red-600';
            statusText = 'شما بدهکارید';
            statusBg = 'bg-red-50';
        } else {
            statusColor = 'text-green-600';
            statusText = 'شما طلبکارید';
            statusBg = 'bg-green-50';
        }
        
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3 space-x-reverse flex-1">
                        <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
                            ${getInitials(friend.name)}
                        </div>
                        <div class="flex-1">
                            <p class="font-bold text-gray-900">${friend.name}</p>
                            <p class="text-xs ${statusColor} font-medium">${statusText}</p>
                        </div>
                    </div>
                    
                    <div class="text-left">
                        <p class="text-xl font-bold ${statusColor}">
                            ${displayAmount} <span class="text-sm">ت</span>
                        </p>
                        ${balance !== 0 ? `
                            <button 
                                onclick="openSettleModal('${friend.id}', '${friend.name}', ${Math.abs(balance)})"
                                class="mt-2 px-4 py-1.5 ${isDebt ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white text-xs font-semibold rounded-lg active:scale-95 transition-all">
                                ${isDebt ? 'پرداخت' : 'دریافت'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Handles sending invitation to a friend
 */
async function handleSendInvitation() {
    const phone = document.getElementById('invite-phone').value.trim();
    const amount = parseFloat(document.getElementById('invite-amount').value);
    const description = document.getElementById('invite-description').value.trim();
    
    // Validation
    if (!phone) {
        return showAlert('لطفاً شماره موبایل را وارد کنید.', 'خطای فرم');
    }
    
    if (!/^09\d{9}$/.test(phone)) {
        return showAlert('فرمت شماره موبایل صحیح نیست.', 'خطای فرم');
    }
    
    if (!amount || amount <= 0) {
        return showAlert('لطفاً مبلغ معتبر وارد کنید.', 'خطای فرم');
    }
    
    if (!description) {
        return showAlert('لطفاً توضیحات را وارد کنید.', 'خطای فرم');
    }
    
    try {
        const result = await API.sendInvitation(phone, amount, description);
        
        // Clear form
        document.getElementById('invite-phone').value = '';
        document.getElementById('invite-amount').value = '';
        document.getElementById('invite-description').value = '';
        
        // Close modal
        hideModal('modal-invite-friend');
        
        // Show success message
        showAlert(result.message || 'دعوتنامه با موفقیت ارسال شد!', 'موفق');
        
        // Reload dashboard
        loadDashboard();
        
    } catch (error) {
        showAlert(error.message || 'خطا در ارسال دعوتنامه.', 'خطا');
    }
}

/**
 * Opens settle debt modal
 */
function openSettleModal(friendId, friendName, amount) {
    currentFriend = { id: friendId, name: friendName, amount: amount };
    
    document.getElementById('settle-friend-name').textContent = friendName;
    document.getElementById('settle-amount').value = amount;
    document.getElementById('settle-amount').max = amount;
    
    showModal('modal-settle-debt');
}

/**
 * Handles settling a debt
 */
async function handleSettleDebt() {
    if (!currentFriend) {
        return showAlert('خطا در شناسایی دوست.', 'خطا');
    }
    
    const amount = parseFloat(document.getElementById('settle-amount').value);
    
    // Validation
    if (!amount || amount <= 0) {
        return showAlert('لطفاً مبلغ معتبر وارد کنید.', 'خطای فرم');
    }
    
    if (amount > currentFriend.amount) {
        return showAlert('مبلغ نمی‌تواند بیشتر از بدهی باشد.', 'خطای فرم');
    }
    
    try {
        const result = await API.settleDebt(currentFriend.id, amount);
        
        // Clear form and close modal
        document.getElementById('settle-amount').value = '';
        hideModal('modal-settle-debt');
        currentFriend = null;
        
        // Show success message
        showAlert(result.message || 'تسویه حساب با موفقیت انجام شد!', 'موفق');
        
        // Reload dashboard
        loadDashboard();
        
    } catch (error) {
        showAlert(error.message || 'خطا در تسویه حساب.', 'خطا');
    }
}

/**
 * Loads profile data
 */
async function loadProfile() {
    try {
        // Get user data from localStorage (saved during login/register or dashboard load)
        let userData = getUserData();

        if (userData) {
            // Update profile view
            document.getElementById('profile-fullname').textContent = userData.fullName || 'کاربر';
            document.getElementById('profile-phone').textContent = userData.phoneNumber || '-';
            document.getElementById('profile-initials').textContent = getInitials(userData.fullName);
            
            // Calculate net balance
            const netBalance = (userData.totalOwedToYou || 0) - (userData.totalYouOwe || 0);
            const netBalanceText = netBalance >= 0 
                ? `+${formatToman(netBalance)} ت` 
                : `-${formatToman(Math.abs(netBalance))} ت`;
            document.getElementById('profile-net-balance').textContent = netBalanceText;
            document.getElementById('profile-net-balance').className = 
                `font-semibold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`;
        }
        
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

console.log('Dashboard Module Loaded');