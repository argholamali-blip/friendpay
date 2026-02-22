// actions.js — FAB menu, Quick Split, Smart Scan, Group, Transfer
// Depends on: dashboard.js (loadDashboard, formatToman, getInitials)
//             ui.js        (showAlert, showModal, hideModal, getUserData)
//             api.js       (API.settleDebt, API.scanReceipt, API.quickSplit)

/* ═══════════════════════════════════════════════════════════
   TOAST (replaces the Tailwind-class showToast in ui.js)
═══════════════════════════════════════════════════════════ */
function showToast(message, type = 'info') {
    // Remove existing
    document.querySelectorAll('.toast-pill').forEach(t => t.remove());

    const pill = document.createElement('div');
    pill.className = `toast-pill ${type}`;
    pill.textContent = message;
    document.body.appendChild(pill);

    // Trigger enter animation on next frame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => pill.classList.add('show'));
    });

    setTimeout(() => {
        pill.classList.remove('show');
        setTimeout(() => pill.remove(), 400);
    }, 2800);
}
window.showToast = showToast;


/* ═══════════════════════════════════════════════════════════
   FAB STATE MACHINE
═══════════════════════════════════════════════════════════ */
let fabOpen = false;

function toggleFAB() {
    fabOpen ? closeFAB() : openFAB();
}

function openFAB() {
    fabOpen = true;
    document.getElementById('fab-btn').classList.add('open');
    document.getElementById('fab-overlay').classList.add('visible');
    document.getElementById('fab-menu').classList.add('open');
    // Haptic feedback on mobile (where supported)
    if (navigator.vibrate) navigator.vibrate(6);
}

function closeFAB() {
    fabOpen = false;
    document.getElementById('fab-btn').classList.remove('open');
    document.getElementById('fab-overlay').classList.remove('visible');
    document.getElementById('fab-menu').classList.remove('open');
}

window.toggleFAB = toggleFAB;
window.openFAB   = openFAB;
window.closeFAB  = closeFAB;


/* ═══════════════════════════════════════════════════════════
   SHARED HELPERS
═══════════════════════════════════════════════════════════ */

// Returns the friend list from the last dashboard load (cached in DOM)
function getCachedFriends() {
    // We pull from the friend cards rendered in the DOM
    const cards = document.querySelectorAll('.friend-card');
    const friends = [];
    cards.forEach(card => {
        const name = card.querySelector('.friend-card-name')?.textContent || '';
        // id is stored as data attribute on the settle button's onclick
        const btn = card.querySelector('.friend-card-btn');
        let id = '';
        if (btn) {
            const match = btn.getAttribute('onclick')?.match(/'([^']+)'/);
            if (match) id = match[1];
        }
        if (name) friends.push({ name, id: id || name });
    });
    return friends;
}

// Build a chip element for a person
function buildChip(person, selectedSet, onToggle, size = 'normal') {
    const div = document.createElement('div');
    div.className = 'qs-chip' + (selectedSet.has(person.id) ? ' selected' : '');
    div.dataset.id = person.id;
    div.innerHTML = `
        <div class="qs-chip-avatar">${getInitials(person.name)}</div>
        <span class="qs-chip-name">${person.name.split(' ')[0]}</span>
    `;
    div.addEventListener('click', () => {
        onToggle(person);
        div.classList.toggle('selected');
    });
    return div;
}


/* ═══════════════════════════════════════════════════════════
   QUICK SPLIT  (attendees → payer → split)
═══════════════════════════════════════════════════════════ */

let qsState = {
    attendees: [],   // [{id, name, phoneNumber, status:'registered'|'pending'}]
    payerId: null,
    weightMode: false,
    weights: {},
};

function openQuickSplit() {
    const me = getUserData();
    const meObj = { id: '__me__', name: me?.fullName || 'من', phoneNumber: me?.phoneNumber || '', status: 'registered' };
    const friends = getCachedFriends().map(f => ({ ...f, status: 'registered', phoneNumber: '' }));

    qsState = { attendees: [meObj, ...friends], payerId: '__me__', weightMode: false, weights: {} };

    document.getElementById('qs-amount').value = '';
    document.getElementById('qs-description').value = '';
    document.getElementById('qs-add-person').classList.add('hidden');
    document.getElementById('qs-search-result').classList.add('hidden');
    document.getElementById('qs-phone-input').value = '';
    document.getElementById('modal-quick-split').classList.remove('hidden');

    renderAttendeesRow();
    renderPayerRow();
    renderSplitList();
    document.getElementById('qs-amount').addEventListener('input', renderSplitList);
}

function closeQuickSplit() {
    document.getElementById('modal-quick-split').classList.add('hidden');
    document.getElementById('qs-amount').removeEventListener('input', renderSplitList);
}

/* ── Attendees row ── */
function renderAttendeesRow() {
    const row = document.getElementById('qs-attendees-row');
    row.innerHTML = '';

    qsState.attendees.forEach(a => {
        const chip = document.createElement('div');
        chip.className = 'qs-chip selected';
        chip.dataset.id = a.id;
        const isPending = a.status === 'pending';
        const bgStyle = isPending ? 'style="background:linear-gradient(135deg,#ffb74d,#f57c00)"' : '';

        chip.innerHTML = `
            <div class="qs-chip-avatar" ${bgStyle}>${getInitials(a.name)}</div>
            <span class="qs-chip-name">${a.name.split(' ')[0]}</span>
            ${isPending ? '<span class="qs-chip-pending-badge">در انتظار</span>' : ''}
        `;
        if (a.id !== '__me__') {
            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
                renderSplitList();
            });
        }
        row.appendChild(chip);
    });

    // "+" add person chip
    const addChip = document.createElement('div');
    addChip.className = 'qs-add-chip';
    addChip.innerHTML = `
        <div class="qs-add-chip-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
        </div>
        <span class="qs-add-chip-label">افزودن</span>
    `;
    addChip.addEventListener('click', () => {
        const el = document.getElementById('qs-add-person');
        el.classList.toggle('hidden');
        if (!el.classList.contains('hidden')) document.getElementById('qs-phone-input').focus();
    });
    row.appendChild(addChip);
}

/* ── Phone search ── */
async function searchPhoneForSplit() {
    const phone = document.getElementById('qs-phone-input').value.trim().replace(/\D/g, '');
    if (!/^09\d{9}$/.test(phone)) return showAlert('شماره باید 11 رقم و با 09 شروع شود.', 'خطا');
    if (qsState.attendees.some(a => a.phoneNumber === phone || a.id === phone))
        return showAlert('این شخص قبلاً اضافه شده است.', 'توجه');

    const btn = document.getElementById('qs-phone-search-btn');
    btn.classList.add('loading');

    try {
        const result = await API.findByPhone(phone);
        const resultDiv = document.getElementById('qs-search-result');
        resultDiv.classList.remove('hidden');

        const isReg = result.found && result.status === 'registered';
        const displayName = isReg ? result.user.fullName : phone;
        const avatarBg = isReg
            ? 'background:linear-gradient(135deg,var(--green-light),var(--green))'
            : 'background:linear-gradient(135deg,#ffb74d,#f57c00)';

        resultDiv.innerHTML = `
            <div class="qs-sr-avatar" style="${avatarBg}">${getInitials(displayName)}</div>
            <div class="qs-sr-info">
                <p class="qs-sr-name">${displayName}</p>
                <p class="qs-sr-phone">${phone}</p>
            </div>
            <span class="qs-sr-badge ${isReg ? 'registered' : 'pending'}">${isReg ? 'عضو' : 'در انتظار'}</span>
            <button class="qs-sr-add-btn" id="qs-sr-add">افزودن</button>
        `;
        document.getElementById('qs-sr-add').addEventListener('click', () => {
            qsState.attendees.push({
                id: isReg ? result.user.id : phone,
                name: displayName,
                phoneNumber: phone,
                status: isReg ? 'registered' : 'pending'
            });
            renderAttendeesRow();
            renderPayerRow();
            renderSplitList();
            document.getElementById('qs-phone-input').value = '';
            resultDiv.classList.add('hidden');
            document.getElementById('qs-add-person').classList.add('hidden');
            showToast(`${displayName.split(' ')[0]} اضافه شد`, 'success');
        });
    } catch (e) {
        showAlert(e.message || 'خطا در جستجو.', 'خطا');
    } finally {
        btn.classList.remove('loading');
    }
}
window.searchPhoneForSplit = searchPhoneForSplit;

/* ── Contact Picker / Paste from clipboard ── */
function normalizeIranPhone(raw) {
    let phone = raw.replace(/[\s\-\(\)\+]/g, '');
    if (phone.startsWith('98') && phone.length === 12) phone = '0' + phone.slice(2);
    else if (phone.startsWith('0098')) phone = '0' + phone.slice(4);
    return phone;
}

async function pickContact() {
    // 1) Try native Contact Picker API (Android Chrome, Samsung Internet)
    if ('contacts' in navigator && 'ContactsManager' in window) {
        try {
            const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
            if (contacts && contacts.length > 0) {
                const contact = contacts[0];
                let phone = normalizeIranPhone((contact.tel && contact.tel[0]) || '');
                if (!/^09\d{9}$/.test(phone)) {
                    showAlert('شماره مخاطب معتبر نیست: ' + phone, 'خطا');
                    return;
                }
                if (qsState.attendees.some(a => a.phoneNumber === phone || a.id === phone)) {
                    showAlert('این شخص قبلاً اضافه شده است.', 'توجه');
                    return;
                }
                document.getElementById('qs-phone-input').value = phone;
                await searchPhoneForSplit();
                return;
            }
        } catch (e) {
            if (e.name !== 'TypeError') console.warn('Contact picker error:', e);
        }
    }

    // 2) Fallback: try reading from clipboard
    if (navigator.clipboard && navigator.clipboard.readText) {
        try {
            const clip = await navigator.clipboard.readText();
            const phone = normalizeIranPhone(clip.trim());
            if (/^09\d{9}$/.test(phone)) {
                document.getElementById('qs-phone-input').value = phone;
                showToast('شماره از کلیپبورد وارد شد', 'success');
                await searchPhoneForSplit();
                return;
            }
        } catch (e) { /* clipboard denied — ignore */ }
    }

    // 3) Nothing worked — guide the user
    showAlert('مرورگر شما از دسترسی مستقیم به مخاطبین پشتیبانی نمی‌کند.\n\n' +
        '💡 شماره موبایل را از لیست مخاطبین کپی کنید، سپس دوباره این دکمه را بزنید تا خودکار وارد شود.', 'راهنما');
}
window.pickContact = pickContact;

// Enter key in phone input triggers search
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('qs-phone-input');
    if (phoneInput) {
        phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchPhoneForSplit();
        });
    }
});

/* ── Payer row ── */
function renderPayerRow() {
    const row = document.getElementById('qs-payer-list');
    row.innerHTML = '';
    qsState.attendees.forEach(a => {
        const chip = document.createElement('div');
        chip.className = 'qs-chip' + (qsState.payerId === a.id ? ' selected' : '');
        chip.dataset.id = a.id;
        const isPending = a.status === 'pending';
        const bgStyle = isPending ? 'style="background:linear-gradient(135deg,#ffb74d,#f57c00)"' : '';
        chip.innerHTML = `
            <div class="qs-chip-avatar" ${bgStyle}>${getInitials(a.name)}</div>
            <span class="qs-chip-name">${a.name.split(' ')[0]}</span>
        `;
        chip.addEventListener('click', () => {
            qsState.payerId = a.id;
            row.querySelectorAll('.qs-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        });
        row.appendChild(chip);
    });
}

/* ── Toggle weight/equal ── */
function toggleSplitMode() {
    qsState.weightMode = !qsState.weightMode;
    document.getElementById('qs-toggle-mode').textContent = qsState.weightMode ? 'تقسیم مساوی' : 'تقسیم بر اساس سهم';
    renderSplitList();
}

/* ── Split list ── */
function renderSplitList() {
    const total = parseFloat(document.getElementById('qs-amount').value) || 0;
    const activeIds = new Set();
    document.querySelectorAll('#qs-attendees-row .qs-chip.selected').forEach(c => { if (c.dataset.id) activeIds.add(c.dataset.id); });
    const active = qsState.attendees.filter(a => activeIds.has(a.id));
    const n = active.length;
    const list = document.getElementById('qs-split-list');
    list.innerHTML = '';

    if (n === 0) { document.getElementById('qs-summary').innerHTML = '<span>هیچ‌کس انتخاب نشده</span>'; return; }

    active.forEach(f => { if (!qsState.weights[f.id]) qsState.weights[f.id] = 1; });
    const totalWeight = active.reduce((s, f) => s + (qsState.weights[f.id] || 1), 0);

    active.forEach(f => {
        const share = qsState.weightMode ? Math.round(total * (qsState.weights[f.id] || 1) / totalWeight) : Math.round(total / n);
        const isPending = f.status === 'pending';
        const avatarBg = isPending ? 'style="background:linear-gradient(135deg,#ffb74d,#f57c00)"' : '';
        const row = document.createElement('div');
        row.className = 'qs-split-row';
        row.innerHTML = `
            <div class="qs-split-row-avatar" ${avatarBg}>${getInitials(f.name)}</div>
            <span class="qs-split-row-name">${f.name.split(' ')[0]}${isPending ? ' <span style="font-size:10px;color:#e65100">(در انتظار)</span>' : ''}</span>
            ${qsState.weightMode ? `<input class="qs-split-row-weight" type="number" min="1" value="${qsState.weights[f.id] || 1}" data-id="${f.id}">` : ''}
            <span class="qs-split-row-amount">${formatToman(share)} ت</span>
        `;
        if (qsState.weightMode) {
            row.querySelector('.qs-split-row-weight').addEventListener('input', (e) => { qsState.weights[f.id] = parseFloat(e.target.value) || 1; renderSplitList(); });
        }
        list.appendChild(row);
    });

    const txt = qsState.weightMode ? '(وزنی)' : `هر نفر: ${formatToman(Math.round(total / n))} تومان`;
    document.getElementById('qs-summary').innerHTML = `<span>${txt}</span>`;
}

/* ── Confirm ── */
async function confirmQuickSplit() {
    const amount = parseFloat(document.getElementById('qs-amount').value);
    const description = document.getElementById('qs-description').value.trim();
    if (!amount || amount <= 0) return showAlert('مبلغ را وارد کنید.', 'خطا');
    if (!description) return showAlert('توضیح هزینه را بنویسید.', 'خطا');

    const activeIds = new Set();
    document.querySelectorAll('#qs-attendees-row .qs-chip.selected').forEach(c => { if (c.dataset.id) activeIds.add(c.dataset.id); });
    const allActive = qsState.attendees.filter(a => activeIds.has(a.id));
    const debtors = allActive.filter(a => a.id !== qsState.payerId);
    if (debtors.length === 0) return showAlert('حداقل یک شرکت‌کننده دیگر انتخاب کنید.', 'خطا');

    const n = allActive.length;
    const totalWeight = allActive.reduce((s, f) => s + (qsState.weights[f.id] || 1), 0);

    const btn = document.querySelector('#modal-quick-split .btn-green');
    btn.disabled = true; btn.textContent = 'در حال ثبت...';

    try {
        const promises = debtors.map(f => {
            const share = qsState.weightMode ? Math.round(amount * ((qsState.weights[f.id] || 1) / totalWeight)) : Math.round(amount / n);
            const phone = f.phoneNumber || (f.id.startsWith('09') ? f.id : null);
            return API.sendInvitation(phone, share, description).catch(() => Promise.resolve());
        });
        await Promise.allSettled(promises);
        closeQuickSplit();
        showToast('هزینه با موفقیت ثبت شد ✓', 'success');
        loadDashboard();
    } catch (e) {
        showAlert(e.message || 'خطا در ثبت هزینه.', 'خطا');
    } finally {
        btn.disabled = false; btn.textContent = 'تایید و ثبت';
    }
}

window.openQuickSplit    = openQuickSplit;
window.closeQuickSplit   = closeQuickSplit;
window.toggleSplitMode   = toggleSplitMode;
window.confirmQuickSplit = confirmQuickSplit;


/* ═══════════════════════════════════════════════════════════
   SMART SCAN
═══════════════════════════════════════════════════════════ */

let scanState = {
    receiptData: null,   // parsed JSON from AI
    assignments: {},     // itemId → { friendId, friendName }
    friends: []
};

function showScanState(name) {
    ['scan-state-upload', 'scan-state-processing', 'scan-state-result'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(name).classList.remove('hidden');
}

function openSmartScan() {
    scanState = { receiptData: null, assignments: {}, friends: getCachedFriends() };
    showScanState('scan-state-upload');
    document.getElementById('modal-smart-scan').classList.remove('hidden');
    // Reset file input so same file can be re-selected
    document.getElementById('scan-file-input').value = '';
}

function closeSmartScan() {
    document.getElementById('modal-smart-scan').classList.add('hidden');
}

async function handleScanFile(input) {
    const file = input.files[0];
    if (!file) return;

    showScanState('scan-state-processing');

    try {
        // Convert image to base64
        const base64 = await fileToBase64(file);

        // Call backend OCR endpoint
        const result = await API.scanReceipt(base64, file.type);

        if (!result || result.status !== 'success') {
            throw new Error('خطا در تحلیل رسید. لطفاً دوباره تلاش کنید.');
        }

        scanState.receiptData = result;
        scanState.assignments = {};

        renderScanResult(result);
        showScanState('scan-state-result');

    } catch (err) {
        showScanState('scan-state-upload');
        showAlert(err.message || 'خطا در پردازش تصویر.', 'خطا');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Strip data URL prefix
            const b64 = reader.result.split(',')[1];
            resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderScanResult(data) {
    const rd = data.receipt_details;

    // Banner
    document.getElementById('scan-merchant').textContent = rd.merchant_name || 'فروشگاه';
    document.getElementById('scan-total-display').textContent = `${formatToman(rd.grand_total)} تومان`;

    // Friends row
    const friendsRow = document.getElementById('scan-friends-row');
    friendsRow.innerHTML = '';
    scanState.friends.forEach(f => {
        const chip = document.createElement('div');
        chip.className = 'qs-chip';
        chip.dataset.id = f.id;
        chip.dataset.name = f.name;
        chip.innerHTML = `
            <div class="qs-chip-avatar" style="background:linear-gradient(135deg,#7c4dff,#512da8)">${getInitials(f.name)}</div>
            <span class="qs-chip-name">${f.name.split(' ')[0]}</span>
        `;
        friendsRow.appendChild(chip);
    });

    // Items list
    const itemsList = document.getElementById('scan-items-list');
    itemsList.innerHTML = '';
    data.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'scan-item-row';
        row.dataset.itemId = item.id;
        row.innerHTML = `
            <span class="scan-item-row-name">${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
            <span class="scan-item-row-price">${formatToman(item.total_price)} ت</span>
            <span class="scan-item-row-assignee" id="assign-${item.id}">تعیین نشده</span>
        `;

        // Tap item → cycle through friends
        let assignIdx = -1;
        row.addEventListener('click', () => {
            const fs = scanState.friends;
            if (fs.length === 0) return;
            assignIdx = (assignIdx + 1) % (fs.length + 1);
            if (assignIdx === fs.length) {
                // Unassign
                delete scanState.assignments[item.id];
                document.getElementById(`assign-${item.id}`).textContent = 'تعیین نشده';
                document.getElementById(`assign-${item.id}`).style.background = '#e0e0e0';
                document.getElementById(`assign-${item.id}`).style.color = '#888';
                row.classList.remove('assigned');
            } else {
                const friend = fs[assignIdx];
                scanState.assignments[item.id] = { friendId: friend.id, friendName: friend.name, itemPrice: item.total_price };
                document.getElementById(`assign-${item.id}`).textContent = friend.name.split(' ')[0];
                document.getElementById(`assign-${item.id}`).style.background = '#c8e6c9';
                document.getElementById(`assign-${item.id}`).style.color = 'var(--green)';
                row.classList.add('assigned');
            }
            renderScanSummary(data);
        });
        itemsList.appendChild(row);
    });

    renderScanSummary(data);
}

function renderScanSummary(data) {
    const feeMultiplier = data.receipt_details.fee_multiplier || 0;
    const summaryList = document.getElementById('scan-summary-list');
    summaryList.innerHTML = '';

    // Aggregate by friend
    const totals = {};
    Object.values(scanState.assignments).forEach(a => {
        if (!totals[a.friendId]) totals[a.friendId] = { name: a.friendName, base: 0 };
        totals[a.friendId].base += a.itemPrice;
    });

    Object.values(totals).forEach(t => {
        const withFee = Math.round(t.base * (1 + feeMultiplier));
        const row = document.createElement('div');
        row.className = 'scan-summary-row';
        row.innerHTML = `
            <span class="scan-summary-row-name">${t.name}</span>
            <span class="scan-summary-row-amount">${formatToman(withFee)} ت</span>
        `;
        summaryList.appendChild(row);
    });
}

async function confirmSmartScan() {
    const assignments = Object.values(scanState.assignments);
    if (assignments.length === 0) return showAlert('حداقل یک قلم را به یک دوست اختصاص دهید.', 'خطا');

    const feeMultiplier = scanState.receiptData?.receipt_details?.fee_multiplier || 0;
    const description = `رسید: ${scanState.receiptData?.receipt_details?.merchant_name || 'فروشگاه'}`;

    const btn = document.querySelector('#modal-smart-scan .btn-green');
    btn.disabled = true;
    btn.textContent = 'در حال ثبت...';

    try {
        // Aggregate totals per friend
        const totals = {};
        assignments.forEach(a => {
            if (!totals[a.friendId]) totals[a.friendId] = { name: a.friendName, base: 0 };
            totals[a.friendId].base += a.itemPrice;
        });

        const promises = Object.entries(totals).map(([friendId, data]) => {
            const withFee = Math.round(data.base * (1 + feeMultiplier));
            return API.sendInvitation(friendId.startsWith('0') ? friendId : null, withFee, description)
                .catch(() => Promise.resolve());
        });

        await Promise.allSettled(promises);
        closeSmartScan();
        showToast('رسید با موفقیت ثبت شد ✓', 'success');
        loadDashboard();
    } catch (e) {
        showAlert(e.message || 'خطا در ثبت رسید.', 'خطا');
    } finally {
        btn.disabled = false;
        btn.textContent = 'تایید و ثبت';
    }
}

window.openSmartScan    = openSmartScan;
window.closeSmartScan   = closeSmartScan;
window.handleScanFile   = handleScanFile;
window.confirmSmartScan = confirmSmartScan;


/* ═══════════════════════════════════════════════════════════
   NEW GROUP
═══════════════════════════════════════════════════════════ */

function openNewGroup() {
    // Set up type chip toggles
    document.querySelectorAll('.grp-type-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.grp-type-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });
    showModal('modal-new-group');
}

window.openNewGroup = openNewGroup;


/* ═══════════════════════════════════════════════════════════
   DIRECT TRANSFER
═══════════════════════════════════════════════════════════ */

function openDirectTransfer() {
    const friends = getCachedFriends();
    const row = document.getElementById('dt-friends-row');
    row.innerHTML = '';
    const selected = new Set();

    friends.forEach(f => {
        const chip = buildChip(f, selected, (person) => {
            selected.clear();
            selected.add(person.id);
            row.querySelectorAll('.qs-chip').forEach(c => c.classList.remove('selected'));
        });
        row.appendChild(chip);
    });

    document.getElementById('dt-amount').value = '';
    document.getElementById('dt-note').value = '';
    showModal('modal-direct-transfer');
}

window.openDirectTransfer = openDirectTransfer;

console.log('✅ Actions Module Loaded');
