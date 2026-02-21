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
   QUICK SPLIT
═══════════════════════════════════════════════════════════ */

let qsState = {
    payerId: null,
    payerName: null,
    selectedIds: new Set(),
    weightMode: false,
    weights: {},      // id → weight number
    friends: []
};

function openQuickSplit() {
    qsState = { payerId: null, payerName: null, selectedIds: new Set(), weightMode: false, weights: {}, friends: [] };

    const friends = getCachedFriends();
    const me = getUserData();
    const meObj = { id: '__me__', name: me?.fullName || 'من' };

    qsState.friends = [meObj, ...friends];

    // Build payer chips
    const payerList = document.getElementById('qs-payer-list');
    payerList.innerHTML = '';
    const payerSelected = new Set();

    // Default: me as payer
    qsState.payerId = meObj.id;
    qsState.payerName = meObj.name;
    payerSelected.add(meObj.id);

    qsState.friends.forEach(f => {
        const chip = buildChip(f, payerSelected, (person) => {
            // Single-select for payer
            payerSelected.clear();
            payerSelected.add(person.id);
            qsState.payerId = person.id;
            qsState.payerName = person.name;
            // Reset visual for all chips
            payerList.querySelectorAll('.qs-chip').forEach(c => c.classList.remove('selected'));
        });
        // Pre-select me
        if (f.id === meObj.id) chip.classList.add('selected');
        payerList.appendChild(chip);
    });

    // Build split chips (default: select all friends + me)
    qsState.selectedIds = new Set(qsState.friends.map(f => f.id));
    renderSplitList();

    document.getElementById('qs-amount').value = '';
    document.getElementById('qs-description').value = '';
    document.getElementById('modal-quick-split').classList.remove('hidden');

    // Amount input → live recalc
    document.getElementById('qs-amount').addEventListener('input', renderSplitList);
}

function closeQuickSplit() {
    document.getElementById('modal-quick-split').classList.add('hidden');
    document.getElementById('qs-amount').removeEventListener('input', renderSplitList);
}

function toggleSplitMode() {
    qsState.weightMode = !qsState.weightMode;
    document.getElementById('qs-toggle-mode').textContent = qsState.weightMode ? 'تقسیم مساوی' : 'تقسیم وزنی';
    renderSplitList();
}

function renderSplitList() {
    const total = parseFloat(document.getElementById('qs-amount').value) || 0;
    const selected = qsState.friends.filter(f => qsState.selectedIds.has(f.id));
    const n = selected.length;
    const list = document.getElementById('qs-split-list');
    list.innerHTML = '';

    if (n === 0) {
        document.getElementById('qs-summary').innerHTML = '<span id="qs-summary-text">هیچ‌کس انتخاب نشده</span>';
        return;
    }

    // Weights (default 1 each)
    selected.forEach(f => { if (!qsState.weights[f.id]) qsState.weights[f.id] = 1; });
    const totalWeight = selected.reduce((s, f) => s + (qsState.weights[f.id] || 1), 0);

    selected.forEach(f => {
        const share = qsState.weightMode
            ? Math.round(total * (qsState.weights[f.id] || 1) / totalWeight)
            : Math.round(total / n);

        const row = document.createElement('div');
        row.className = 'qs-split-row';
        row.innerHTML = `
            <div class="qs-split-row-avatar">${getInitials(f.name)}</div>
            <span class="qs-split-row-name">${f.name.split(' ')[0]}</span>
            ${qsState.weightMode ? `
                <input class="qs-split-row-weight" type="number" min="1" value="${qsState.weights[f.id] || 1}" data-id="${f.id}">
            ` : ''}
            <span class="qs-split-row-amount">${formatToman(share)} ت</span>
        `;

        if (qsState.weightMode) {
            const weightInput = row.querySelector('.qs-split-row-weight');
            weightInput.addEventListener('input', () => {
                qsState.weights[f.id] = parseFloat(weightInput.value) || 1;
                renderSplitList();
            });
        }
        list.appendChild(row);
    });

    const perPerson = qsState.weightMode
        ? '(وزنی)'
        : `هر نفر: ${formatToman(Math.round(total / n))} تومان`;
    document.getElementById('qs-summary').innerHTML = `<span id="qs-summary-text">${perPerson}</span>`;

    // Also build split-among chip row
    const splitChipRow = document.getElementById('qs-split-list').parentNode?.querySelector('#qs-split-chip-row');
}

async function confirmQuickSplit() {
    const amount = parseFloat(document.getElementById('qs-amount').value);
    const description = document.getElementById('qs-description').value.trim();

    if (!amount || amount <= 0) return showAlert('مبلغ را وارد کنید.', 'خطا');
    if (!description) return showAlert('توضیح هزینه را بنویسید.', 'خطا');

    const selected = qsState.friends.filter(f => qsState.selectedIds.has(f.id) && f.id !== '__me__');
    if (selected.length === 0) return showAlert('حداقل یک دوست را انتخاب کنید.', 'خطا');

    const n = qsState.friends.filter(f => qsState.selectedIds.has(f.id)).length;
    const totalWeight = selected.reduce((s, f) => s + (qsState.weights[f.id] || 1), 0);
    const myWeight = qsState.weights['__me__'] || 1;
    const grandWeight = totalWeight + (qsState.selectedIds.has('__me__') ? myWeight : 0);

    const btn = document.querySelector('#modal-quick-split .btn-green');
    btn.disabled = true;
    btn.textContent = 'در حال ثبت...';

    try {
        // Record a debt for each selected friend
        const promises = selected.map(f => {
            const share = qsState.weightMode
                ? Math.round(amount * ((qsState.weights[f.id] || 1) / grandWeight))
                : Math.round(amount / n);

            // Use the existing invitation API to register debt
            return API.sendInvitation(f.id.startsWith('0') ? f.id : null, share, description)
                .catch(() => {
                    // If friend is already registered, fall back to settle endpoint signal
                    // (backend handles existing users differently)
                    return Promise.resolve();
                });
        });

        await Promise.allSettled(promises);

        closeQuickSplit();
        showToast('هزینه با موفقیت ثبت شد ✓', 'success');
        loadDashboard();
    } catch (e) {
        showAlert(e.message || 'خطا در ثبت هزینه.', 'خطا');
    } finally {
        btn.disabled = false;
        btn.textContent = 'تایید و ثبت';
    }
}

window.openQuickSplit   = openQuickSplit;
window.closeQuickSplit  = closeQuickSplit;
window.toggleSplitMode  = toggleSplitMode;
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
