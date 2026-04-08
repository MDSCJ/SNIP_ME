// ═══════════════════════════════════════════════════════════
//  SNIP ME — Booking JS  
// ═══════════════════════════════════════════════════════════

let bookingState = {
    salonId: null, salonName: null, salonDescription: null,
    services: [], selectedService: null, selectedDate: null,
    selectedSlot: null, customerID: null, bookingID: null,
    paymentMethod: 'online'
};

const DUMMY_SLOTS = [
    { slotID: 'slot-001', label: '09:00 - 09:30' },
    { slotID: 'slot-002', label: '09:30 - 10:00' },
    { slotID: 'slot-003', label: '10:00 - 10:30' },
    { slotID: 'slot-004', label: '10:30 - 11:00' },
    { slotID: 'slot-005', label: '11:00 - 11:30' },
    { slotID: 'slot-006', label: '11:30 - 12:00' },
    { slotID: 'slot-007', label: '14:00 - 14:30' },
    { slotID: 'slot-008', label: '14:30 - 15:00' },
    { slotID: 'slot-009', label: '15:00 - 15:30' },
    { slotID: 'slot-010', label: '15:30 - 16:00' },
];
const DUMMY_SERVICES = ['Haircut', 'Beard Trim', 'Styling', 'Hair Wash', 'Hair Color'];
const AMOUNT_DISPLAY = 'Rs. 7,750.00';

document.addEventListener('DOMContentLoaded', function () {
    bookingState.customerID = localStorage.getItem('customerID') || sessionStorage.getItem('customerID') || 'DEMO-USER';

    const params = new URLSearchParams(window.location.search);
    bookingState.salonId          = params.get('salonId')   || sessionStorage.getItem('selectedSalonId')   || 'demo-salon';
    bookingState.salonName        = params.get('salonName') || sessionStorage.getItem('selectedSalonName') || 'Demo Salon';
    bookingState.salonDescription = params.get('salonDesc') || sessionStorage.getItem('selectedSalonDesc') || 'Professional salon services';

    const paramServices = params.get('services') || sessionStorage.getItem('selectedServices');
    bookingState.services = paramServices ? JSON.parse(paramServices) : DUMMY_SERVICES;

    document.getElementById('salonName').textContent        = bookingState.salonName;
    document.getElementById('salonDescription').textContent = bookingState.salonDescription;
    document.getElementById('salonNameStep2').textContent   = 'at ' + bookingState.salonName;

    const serviceSelect = document.getElementById('serviceSelect');
    bookingState.services.forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        serviceSelect.appendChild(o);
    });
    serviceSelect.addEventListener('change', updateServiceDisplay);

    const dateInput = document.getElementById('dateInput');
    dateInput.addEventListener('change', validateDate);
    const calendarBtn = document.getElementById('calendarBtn');
    if (calendarBtn) {
        calendarBtn.addEventListener('click', () => {
            dateInput.showPicker ? dateInput.showPicker() : dateInput.focus();
        });
    }

    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function () {
            bookingState.paymentMethod = this.value;
            applyPaymentSelection();
        });
    });

    const gatewayBackBtn = document.getElementById('gatewayBackBtn');
    if (gatewayBackBtn) {
        gatewayBackBtn.addEventListener('click', function (e) {
            backToMainPayment(e);
        });
    }

    dateInput.min = new Date().toISOString().split('T')[0];

    const pgCard = document.getElementById('pgCardNumber');
    if (pgCard) {
        pgCard.addEventListener('input', function () {
            const raw = this.value.replace(/\D/g, '').slice(0, 16);
            this.value = raw.match(/.{1,4}/g)?.join(' ') || raw;
            detectCardType(raw);
            validateFieldLive('number');
        });
        pgCard.addEventListener('blur', () => validateFieldLive('number'));
    }

    const pgExp = document.getElementById('pgExpiry');
    if (pgExp) {
        pgExp.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
            this.value = v;
            validateFieldLive('expiry');
        });
        pgExp.addEventListener('blur', () => validateFieldLive('expiry'));
    }

    const pgCVV = document.getElementById('pgCVV');
    if (pgCVV) {
        pgCVV.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 4);
            validateFieldLive('cvv');
        });
        pgCVV.addEventListener('blur', () => validateFieldLive('cvv'));
    }

    const pgName = document.getElementById('pgCardName');
    if (pgName) {
        pgName.addEventListener('input', () => validateFieldLive('name'));
        pgName.addEventListener('blur', () => validateFieldLive('name'));
    }
});

// ── Step 1 ────────────────────────────────────────────────
function updateServiceDisplay() {
    const s = document.getElementById('serviceSelect').value;
    bookingState.selectedService = s || null;
    document.getElementById('selectedServiceDisplay').textContent = s ? 'Selected: ' + s : 'None selected';
}

function validateDate() {
    const inp = document.getElementById('dateInput');
    const err = document.getElementById('dateError');
    if (!inp.value) {
        err.textContent = 'Please select a date';
        return false;
    }
    const sel = new Date(inp.value);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (sel < today) {
        err.textContent = 'Cannot book in the past';
        return false;
    }
    err.textContent = '';
    bookingState.selectedDate = inp.value;
    return true;
}

function proceedToSlots() {
    if (!document.getElementById('serviceSelect').value) {
        alert('Please select a service');
        return;
    }
    if (!validateDate()) return;
    goToStep(2);
    loadAvailableSlots();
}

// ── Step 2 ────────────────────────────────────────────────
function loadAvailableSlots() {
    const grid = document.getElementById('timeSlotsGrid');
    grid.innerHTML = '<p class="loading">Loading available slots...</p>';
    setTimeout(() => displaySlots(DUMMY_SLOTS), 600);
}

function displaySlots(slots) {
    const grid = document.getElementById('timeSlotsGrid');
    grid.innerHTML = '';
    if (!slots.length) {
        grid.innerHTML = '<p class="no-slots">No slots available.</p>';
        return;
    }
    slots.forEach(slot => grid.appendChild(createSlotElement(slot)));
    document.getElementById('nextBtn2').disabled = true;
}

function createSlotElement(slot) {
    const div = document.createElement('div');
    div.className = 'time-slot';
    div.innerHTML = `
        <input type="radio" name="timeSlot" value="${slot.slotID}" id="${slot.slotID}">
        <label for="${slot.slotID}">
            <span class="slot-time">${slot.label}</span>
            <span class="slot-duration">30 min</span>
        </label>`;
    div.addEventListener('click', () => {
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        div.classList.add('selected');
        bookingState.selectedSlot = slot.slotID;
        document.getElementById('nextBtn2').disabled = false;
    });
    return div;
}

// ── Step 3 ────────────────────────────────────────────────
function proceedToPayment() {
    if (!bookingState.selectedSlot) {
        alert('Please select a time slot');
        return;
    }
    goToStep(3);
    fillSummaries();
    bookingState.paymentMethod = 'online';
    document.getElementById('onlinePayment').checked = true;
    showMainBox();
}

function fillSummaries() {
    const slot = DUMMY_SLOTS.find(s => s.slotID === bookingState.selectedSlot);
    const slotLbl = slot ? slot.label : '';
    const dateLbl = new Date(bookingState.selectedDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    document.getElementById('summSalon').textContent     = bookingState.salonName;
    document.getElementById('summService').textContent   = bookingState.selectedService || '-';
    document.getElementById('summDate').textContent      = dateLbl;
    document.getElementById('summTime').textContent      = slotLbl;
    document.getElementById('summAmount').textContent    = AMOUNT_DISPLAY;
    document.getElementById('cashAmount').textContent    = AMOUNT_DISPLAY;

    document.getElementById('pgSummService').textContent = bookingState.selectedService || '-';
    document.getElementById('pgSummDate').textContent    = dateLbl;
    document.getElementById('pgSummTime').textContent    = slotLbl;
    document.getElementById('pgSummTotal').textContent   = AMOUNT_DISPLAY;
    document.getElementById('pgBtnAmount').textContent   = AMOUNT_DISPLAY;
}

function showMainBox() {
    const mainBox = document.getElementById('mainPaymentBox');
    const gatewayBox = document.getElementById('paymentGateway');

    mainBox.style.display = 'block';
    gatewayBox.style.display = 'none';

    applyPaymentSelection();
    clearGatewayErrors();
    hideProcessingOverlay();

    const pgBtn = document.getElementById('pgConfirmBtn');
    const pgCardBlock = document.querySelector('.pg-card-block');

    if (pgBtn) {
        pgBtn.disabled = false;
        pgBtn.classList.remove('loading-state');
        pgBtn.innerHTML = 'Confirm Booking — <span id="pgBtnAmount">' + AMOUNT_DISPLAY + '</span>';
    }

    if (pgCardBlock) {
        pgCardBlock.classList.remove('processing-disabled');
    }
}

function showGateway() {
    const mainBox = document.getElementById('mainPaymentBox');
    const gatewayBox = document.getElementById('paymentGateway');

    mainBox.style.display = 'none';
    gatewayBox.style.display = 'block';

    clearGatewayErrors();
    hideProcessingOverlay();
}

function applyPaymentSelection() {
    const isCash = bookingState.paymentMethod === 'cash';
    document.getElementById('cashSection').style.display   = isCash ? 'block' : 'none';
    document.getElementById('onlineActions').style.display = isCash ? 'none'  : 'flex';
}

function proceedToGateway() {
    showGateway();
}

function backToMainPayment(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    showMainBox();
}

// ── Card type detection ───────────────────────────────────
function detectCardType(raw) {
    let type = '';
    if (/^4/.test(raw)) type = 'visa';
    else if (/^5[1-5]/.test(raw)) type = 'mc';
    else if (/^3[47]/.test(raw)) type = 'amex';
    else if (/^6/.test(raw)) type = 'discover';

    document.querySelectorAll('.card-icon-item').forEach(el => {
        const isMatch = !type || el.dataset.card === type;
        el.classList.toggle('dim', !isMatch);
        el.classList.toggle('active', isMatch);
    });
}

// ── Live validation helpers ───────────────────────────────
function setFieldState(inputId, errorId, isValid, message = '') {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (!input || !error) return;

    input.classList.remove('valid', 'invalid');

    if (message) {
        error.textContent = message;
    } else {
        error.textContent = '';
    }

    if (input.value.trim() === '') {
        return;
    }

    input.classList.add(isValid ? 'valid' : 'invalid');
}

function validateFieldLive(fieldName) {
    if (fieldName === 'name') {
        const value = document.getElementById('pgCardName').value.trim();
        if (!value) {
            setFieldState('pgCardName', 'nameError', false, '');
            return false;
        }
        const ok = value.length >= 3;
        setFieldState('pgCardName', 'nameError', ok, ok ? '' : 'Enter the cardholder name.');
        return ok;
    }

    if (fieldName === 'number') {
        const value = document.getElementById('pgCardNumber').value.replace(/\s/g, '');
        if (!value) {
            setFieldState('pgCardNumber', 'numberError', false, '');
            return false;
        }
        const ok = value.length === 16;
        setFieldState('pgCardNumber', 'numberError', ok, ok ? '' : 'Card number must be 16 digits.');
        return ok;
    }

    if (fieldName === 'expiry') {
        const value = document.getElementById('pgExpiry').value.trim();
        if (!value) {
            setFieldState('pgExpiry', 'expiryError', false, '');
            return false;
        }
        const ok = /^\d{2}\/\d{2}$/.test(value);
        setFieldState('pgExpiry', 'expiryError', ok, ok ? '' : 'Use MM/YY format.');
        return ok;
    }

    if (fieldName === 'cvv') {
        const value = document.getElementById('pgCVV').value.trim();
        if (!value) {
            setFieldState('pgCVV', 'cvvError', false, '');
            return false;
        }
        const ok = value.length >= 3;
        setFieldState('pgCVV', 'cvvError', ok, ok ? '' : 'CVV must be at least 3 digits.');
        return ok;
    }

    return true;
}

function clearGatewayErrors() {
    const pgError = document.getElementById('pgError');
    if (pgError) {
        pgError.textContent = '';
        pgError.classList.remove('shake');
    }

    ['pgCardName', 'pgCardNumber', 'pgExpiry', 'pgCVV'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('valid', 'invalid');
    });

    ['nameError', 'numberError', 'expiryError', 'cvvError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

// ── Processing overlay ────────────────────────────────────
function showProcessingOverlay() {
    const overlay = document.getElementById('pgOverlay');
    const pgCardBlock = document.querySelector('.pg-card-block');
    const btn = document.getElementById('pgConfirmBtn');

    if (overlay) overlay.classList.add('show');
    if (pgCardBlock) pgCardBlock.classList.add('processing-disabled');
    if (btn) btn.classList.add('loading-state');
}

function hideProcessingOverlay() {
    const overlay = document.getElementById('pgOverlay');
    const pgCardBlock = document.querySelector('.pg-card-block');
    const btn = document.getElementById('pgConfirmBtn');

    if (overlay) overlay.classList.remove('show');
    if (pgCardBlock) pgCardBlock.classList.remove('processing-disabled');
    if (btn) btn.classList.remove('loading-state');
}

// ── Online confirm ────────────────────────────────────────
function confirmOnlinePayment() {
    const nameOk = validateFieldLive('name');
    const numberOk = validateFieldLive('number');
    const expiryOk = validateFieldLive('expiry');
    const cvvOk = validateFieldLive('cvv');

    if (!(nameOk && numberOk && expiryOk && cvvOk)) {
        flashError('Please correct the highlighted payment fields.');
        return;
    }

    document.getElementById('pgError').textContent = '';
    const btn = document.getElementById('pgConfirmBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="pg-spinner"></span> Processing payment…';

    showProcessingOverlay();

    setTimeout(() => {
        hideProcessingOverlay();
        btn.disabled  = false;
        btn.innerHTML = 'Confirm Booking — <span id="pgBtnAmount">' + AMOUNT_DISPLAY + '</span>';
        finishBooking('online');
    }, 1800);
}

function flashError(msg) {
    const el = document.getElementById('pgError');
    el.textContent = msg;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

// ── Cash confirm ──────────────────────────────────────────
function confirmCashPayment() {
    const btn = document.getElementById('cashConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Confirming…';
    setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Confirm Booking';
        finishBooking('cash');
    }, 1000);
}

// ── Success ───────────────────────────────────────────────
function finishBooking(method) {
    bookingState.bookingID = 'BOOK-' + Date.now();
    bookingState.paymentMethod = method;

    const slot    = DUMMY_SLOTS.find(s => s.slotID === bookingState.selectedSlot);
    const slotLbl = slot ? slot.label : '';
    const dateLbl = new Date(bookingState.selectedDate).toLocaleDateString('en-US', {
        weekday:'long', year:'numeric', month:'long', day:'numeric'
    });

    let bookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    bookings.push({
        bookingID: bookingState.bookingID,
        salonName: bookingState.salonName,
        service: bookingState.selectedService,
        date: bookingState.selectedDate,
        slotID: bookingState.selectedSlot,
        paymentMethod: method,
        status: 'CONFIRMED',
        bookingDate: new Date().toISOString()
    });
    localStorage.setItem('userBookings', JSON.stringify(bookings));

    document.getElementById('confirmationDetails').innerHTML = `
        <div class="cd-row"><span>Booking ID</span><span>${bookingState.bookingID}</span></div>
        <div class="cd-row"><span>Salon</span><span>${bookingState.salonName}</span></div>
        <div class="cd-row"><span>Service</span><span>${bookingState.selectedService}</span></div>
        <div class="cd-row"><span>Date</span><span>${dateLbl}</span></div>
        <div class="cd-row"><span>Time</span><span>${slotLbl}</span></div>
        <div class="cd-row"><span>Payment</span><span>${method === 'cash' ? 'Cash at Salon' : 'Card (Online)'}</span></div>
        <div class="cd-row cd-total"><span>Amount</span><span>${AMOUNT_DISPLAY}</span></div>`;

    goToStep(4);
}

// ── Navigation ────────────────────────────────────────────
function goToStep(n) {
    document.querySelectorAll('.step-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

    if (n === 4) {
        document.getElementById('successContent').classList.add('active');
    } else {
        document.getElementById('step' + n + '-content').classList.add('active');
        document.getElementById('step' + n).classList.add('active');
    }
}

function goToPreviousStep(n) {
    if (n > 1) goToStep(n - 1);
}
function goBack() {
    window.history.back();
}
function goToSettings() {
    window.location.href = 'settings.html?tab=bookings';
}
function goHome() {
    window.location.href = '../index.html';
}