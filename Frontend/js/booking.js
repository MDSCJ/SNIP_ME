// ═══════════════════════════════════════════════════════════
//  SNIP ME — Booking JS
//  - No cash payment option
//  - PayHere sandbox for online payment
//  - Dummy slots always shown
//  - Date: tomorrow to +7 days only
//  NOTE: API_BASE_URL comes from js/api-config.js
// ═══════════════════════════════════════════════════════════

const AMOUNT_DISPLAY = 'Rs. 7,750.00';
const AMOUNT_VALUE   = '7750.00';
const CURRENCY       = 'LKR';

let bookingState = {
    salonId: null, salonName: null, salonDescription: null,
    services: [], selectedService: null, selectedDate: null,
    selectedSlot: null, customerID: null, bookingID: null,
    orderId: null
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

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    bookingState.customerID = localStorage.getItem('customerID')
                           || sessionStorage.getItem('customerID')
                           || 'DEMO-USER';

    const params = new URLSearchParams(window.location.search);
    bookingState.salonId          = params.get('salonId')   || sessionStorage.getItem('selectedSalonId')   || 'demo-salon';
    bookingState.salonName        = params.get('salonName') || sessionStorage.getItem('selectedSalonName') || 'Demo Salon';
    bookingState.salonDescription = params.get('salonDesc') || sessionStorage.getItem('selectedSalonDesc') || 'Professional salon services';

    const paramServices = params.get('services') || sessionStorage.getItem('selectedServices');
    bookingState.services = paramServices ? JSON.parse(paramServices) : DUMMY_SERVICES;

    document.getElementById('salonName').textContent        = bookingState.salonName;
    document.getElementById('salonDescription').textContent = bookingState.salonDescription;
    document.getElementById('salonNameStep2').textContent   = 'at ' + bookingState.salonName;

    // Populate services
    const serviceSelect = document.getElementById('serviceSelect');
    bookingState.services.forEach(function(s) {
        const o = document.createElement('option');
        o.value = s; o.textContent = s;
        serviceSelect.appendChild(o);
    });
    serviceSelect.addEventListener('change', updateServiceDisplay);

    // ── Date: tomorrow min, +7 days max ──────────────────
    const dateInput = document.getElementById('dateInput');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    maxDate.setHours(0, 0, 0, 0);

    dateInput.min = tomorrow.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
    dateInput.addEventListener('change', validateDate);

    const calendarBtn = document.getElementById('calendarBtn');
    if (calendarBtn) {
        calendarBtn.addEventListener('click', function() {
            dateInput.showPicker ? dateInput.showPicker() : dateInput.focus();
        });
    }

    // Gateway back button
    const gatewayBackBtn = document.getElementById('gatewayBackBtn');
    if (gatewayBackBtn) {
        gatewayBackBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showMainBox();
        });
    }

    // Card field listeners
    const pgCard = document.getElementById('pgCardNumber');
    if (pgCard) {
        pgCard.addEventListener('input', function() {
            const raw = this.value.replace(/\D/g, '').slice(0, 16);
            this.value = raw.match(/.{1,4}/g)?.join(' ') || raw;
            detectCardType(raw);
            validateFieldLive('number');
        });
        pgCard.addEventListener('blur', function() { validateFieldLive('number'); });
    }

    const pgExp = document.getElementById('pgExpiry');
    if (pgExp) {
        pgExp.addEventListener('input', function() {
            let v = this.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
            this.value = v;
            validateFieldLive('expiry');
        });
        pgExp.addEventListener('blur', function() { validateFieldLive('expiry'); });
    }

    const pgCVV = document.getElementById('pgCVV');
    if (pgCVV) {
        pgCVV.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 4);
            validateFieldLive('cvv');
        });
        pgCVV.addEventListener('blur', function() { validateFieldLive('cvv'); });
    }

    const pgName = document.getElementById('pgCardName');
    if (pgName) {
        pgName.addEventListener('input',  function() { validateFieldLive('name'); });
        pgName.addEventListener('blur',   function() { validateFieldLive('name'); });
    }

    // Start PayHere handler setup
    setupPayHereHandlers();
});

// ─────────────────────────────────────────────────────────
// PAYHERE SANDBOX HANDLERS
// ─────────────────────────────────────────────────────────
function setupPayHereHandlers() {
    if (typeof payhere === 'undefined') {
        setTimeout(setupPayHereHandlers, 300);
        return;
    }

    // Called when PayHere payment completes successfully
    payhere.onCompleted = function onCompleted(orderId) {
        console.log('PayHere payment completed. OrderID:', orderId);
        confirmBookingInBackend();
    };

    // Called when user closes PayHere popup without paying
    payhere.onDismissed = function onDismissed() {
        console.log('PayHere dismissed by user');
        hideProcessingOverlay();
        resetConfirmBtn();
        flashError('Payment was cancelled. You can try again.');
    };

    // Called when PayHere encounters an error
    payhere.onError = function onError(error) {
        console.error('PayHere error:', error);
        hideProcessingOverlay();
        resetConfirmBtn();
        flashError('Payment error occurred. Please try again.');
    };
}

function resetConfirmBtn() {
    const btn = document.getElementById('pgConfirmBtn');
    if (btn) {
        btn.disabled  = false;
        btn.classList.remove('loading-state');
        btn.innerHTML = 'Confirm Booking — <span id="pgBtnAmount">' + AMOUNT_DISPLAY + '</span>';
    }
    document.querySelector('.pg-card-block')?.classList.remove('processing-disabled');
}

// ─────────────────────────────────────────────────────────
// CONFIRM BOOKING IN SPRING BOOT AFTER PAYHERE SUCCESS
// Uses existing BookingController /api/bookings/confirm
// ─────────────────────────────────────────────────────────
function confirmBookingInBackend() {
    const slotID     = bookingState.selectedSlot;
    const customerID = bookingState.customerID;

    fetch(API_BASE_URL + '/bookings/confirm?slotID=' + slotID + '&customerID=' + customerID, {
        method: 'POST'
    })
    .then(function(res) { return res.text(); })
    .then(function(data) {
        console.log('Backend confirmed:', data);
        const match = data.match(/Booking ID:\s*(\d+)/i);
        if (match) bookingState.bookingID = match[1];
        finishBooking();
    })
    .catch(function(err) {
        console.error('Backend confirm error (payment already done):', err);
        finishBooking(); // Payment done — still show success
    });
}

// ─────────────────────────────────────────────────────────
// STEP 1
// ─────────────────────────────────────────────────────────
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

    const sel      = new Date(inp.value + 'T00:00:00');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);

    if (sel < tomorrow) {
        err.textContent = 'Please select from tomorrow onwards';
        return false;
    }
    if (sel > maxDate) {
        err.textContent = 'Cannot book more than 7 days ahead';
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

// ─────────────────────────────────────────────────────────
// STEP 2 — always dummy slots, no backend needed
// ─────────────────────────────────────────────────────────
function loadAvailableSlots() {
    const grid = document.getElementById('timeSlotsGrid');
    grid.innerHTML = '<p class="loading">Loading available slots...</p>';
    setTimeout(function() { displaySlots(DUMMY_SLOTS); }, 500);
}

function displaySlots(slots) {
    const grid = document.getElementById('timeSlotsGrid');
    grid.innerHTML = '';
    if (!slots || slots.length === 0) {
        grid.innerHTML = '<p class="no-slots">No slots available.</p>';
        return;
    }
    slots.forEach(function(slot) { grid.appendChild(createSlotElement(slot)); });
    document.getElementById('nextBtn2').disabled = true;
}

function createSlotElement(slot) {
    const div = document.createElement('div');
    div.className = 'time-slot';
    div.innerHTML =
        '<input type="radio" name="timeSlot" value="' + slot.slotID + '" id="' + slot.slotID + '">' +
        '<label for="' + slot.slotID + '">' +
            '<span class="slot-time">' + slot.label + '</span>' +
            '<span class="slot-duration">30 min</span>' +
        '</label>';
    div.addEventListener('click', function() {
        document.querySelectorAll('.time-slot').forEach(function(s) { s.classList.remove('selected'); });
        div.classList.add('selected');
        bookingState.selectedSlot = slot.slotID;
        document.getElementById('nextBtn2').disabled = false;
    });
    return div;
}

// ─────────────────────────────────────────────────────────
// STEP 3 — PAYMENT
// ─────────────────────────────────────────────────────────
function proceedToPayment() {
    if (!bookingState.selectedSlot) { alert('Please select a time slot'); return; }
    goToStep(3);
    fillSummaries();
    showMainBox();
}

function fillSummaries() {
    const slot    = DUMMY_SLOTS.find(function(s) { return s.slotID === bookingState.selectedSlot; });
    const slotLbl = slot ? slot.label : '';
    const dateLbl = new Date(bookingState.selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    document.getElementById('summSalon').textContent   = bookingState.salonName;
    document.getElementById('summService').textContent = bookingState.selectedService || '-';
    document.getElementById('summDate').textContent    = dateLbl;
    document.getElementById('summTime').textContent    = slotLbl;
    document.getElementById('summAmount').textContent  = AMOUNT_DISPLAY;

    document.getElementById('pgSummService').textContent = bookingState.selectedService || '-';
    document.getElementById('pgSummDate').textContent    = dateLbl;
    document.getElementById('pgSummTime').textContent    = slotLbl;
    document.getElementById('pgSummTotal').textContent   = AMOUNT_DISPLAY;
    document.getElementById('pgBtnAmount').textContent   = AMOUNT_DISPLAY;
}

function showMainBox() {
    document.getElementById('mainPaymentBox').style.display  = 'block';
    document.getElementById('paymentGateway').style.display  = 'none';
    clearGatewayErrors();
    hideProcessingOverlay();
    resetConfirmBtn();
}

function showGateway() {
    document.getElementById('mainPaymentBox').style.display = 'none';
    document.getElementById('paymentGateway').style.display = 'block';
    clearGatewayErrors();
    hideProcessingOverlay();
}

function proceedToGateway() {
    showGateway();
}

// ── Card type detection ───────────────────────────────────
function detectCardType(raw) {
    let type = '';
    if (/^4/.test(raw))            type = 'visa';
    else if (/^5[1-5]/.test(raw))  type = 'mc';
    else if (/^3[47]/.test(raw))   type = 'amex';
    else if (/^6/.test(raw))       type = 'discover';

    document.querySelectorAll('.card-icon-item').forEach(function(el) {
        const isMatch = !type || el.dataset.card === type;
        el.classList.toggle('dim',    !isMatch);
        el.classList.toggle('active',  isMatch);
    });
}

// ── Live field validation ─────────────────────────────────
function setFieldState(inputId, errorId, isValid, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (!input || !error) return false;
    input.classList.remove('valid', 'invalid');
    error.textContent = message || '';
    if (!input.value.trim()) return false;
    input.classList.add(isValid ? 'valid' : 'invalid');
    return isValid;
}

function validateFieldLive(fieldName) {
    if (fieldName === 'name') {
        const v = document.getElementById('pgCardName').value.trim();
        if (!v) { setFieldState('pgCardName', 'nameError', false, ''); return false; }
        const ok = v.length >= 2;
        setFieldState('pgCardName', 'nameError', ok, ok ? '' : 'Enter the cardholder name.');
        return ok;
    }
    if (fieldName === 'number') {
        const v = document.getElementById('pgCardNumber').value.replace(/\s/g, '');
        if (!v) { setFieldState('pgCardNumber', 'numberError', false, ''); return false; }
        const ok = v.length === 16;
        setFieldState('pgCardNumber', 'numberError', ok, ok ? '' : 'Card number must be 16 digits.');
        return ok;
    }
    if (fieldName === 'expiry') {
        const v = document.getElementById('pgExpiry').value.trim();
        if (!v) { setFieldState('pgExpiry', 'expiryError', false, ''); return false; }
        const ok = /^\d{2}\/\d{2}$/.test(v);
        setFieldState('pgExpiry', 'expiryError', ok, ok ? '' : 'Use MM/YY format.');
        return ok;
    }
    if (fieldName === 'cvv') {
        const v = document.getElementById('pgCVV').value.trim();
        if (!v) { setFieldState('pgCVV', 'cvvError', false, ''); return false; }
        const ok = v.length >= 3;
        setFieldState('pgCVV', 'cvvError', ok, ok ? '' : 'CVV must be at least 3 digits.');
        return ok;
    }
    return true;
}

function clearGatewayErrors() {
    const pgError = document.getElementById('pgError');
    if (pgError) { pgError.textContent = ''; pgError.classList.remove('shake'); }
    ['pgCardName','pgCardNumber','pgExpiry','pgCVV'].forEach(function(id) {
        document.getElementById(id)?.classList.remove('valid','invalid');
    });
    ['nameError','numberError','expiryError','cvvError'].forEach(function(id) {
        const el = document.getElementById(id); if (el) el.textContent = '';
    });
}

// ── Processing overlay ────────────────────────────────────
function showProcessingOverlay() {
    document.getElementById('pgOverlay')?.classList.add('show');
    document.querySelector('.pg-card-block')?.classList.add('processing-disabled');
    document.getElementById('pgConfirmBtn')?.classList.add('loading-state');
}

function hideProcessingOverlay() {
    document.getElementById('pgOverlay')?.classList.remove('show');
    document.querySelector('.pg-card-block')?.classList.remove('processing-disabled');
    document.getElementById('pgConfirmBtn')?.classList.remove('loading-state');
}

// ─────────────────────────────────────────────────────────
// CONFIRM ONLINE PAYMENT
// 1. Validates fields
// 2. Calls Spring Boot /api/payment/hash
// 3. Opens real PayHere sandbox popup
// ─────────────────────────────────────────────────────────
function confirmOnlinePayment() {
    const nameOk   = validateFieldLive('name');
    const numberOk = validateFieldLive('number');
    const expiryOk = validateFieldLive('expiry');
    const cvvOk    = validateFieldLive('cvv');

    if (!(nameOk && numberOk && expiryOk && cvvOk)) {
        flashError('Please correct the highlighted fields.');
        return;
    }

    document.getElementById('pgError').textContent = '';
    const btn = document.getElementById('pgConfirmBtn');
    btn.disabled  = true;
    btn.innerHTML = '<span class="pg-spinner"></span> Connecting to PayHere…';
    showProcessingOverlay();

    // Generate unique order ID
    bookingState.orderId = 'SNIPME-' + Date.now();

    // Call Spring Boot backend for secure hash
    fetch(API_BASE_URL + '/payment/hash'
        + '?orderId='  + bookingState.orderId
        + '&amount='   + AMOUNT_VALUE
        + '&currency=' + CURRENCY)
    .then(function(res) {
        if (!res.ok) throw new Error('Backend returned ' + res.status);
        return res.json();
    })
    .then(function(data) {
        // Get name parts from card name field
        const cardName  = document.getElementById('pgCardName').value.trim();
        const nameParts = cardName.split(' ');
        const firstName = nameParts[0] || 'Customer';
        const lastName  = nameParts.slice(1).join(' ') || 'User';

        // Build PayHere payment object
        const payment = {
            sandbox:     true,                    // SANDBOX MODE
            merchant_id: data.merchant_id,
            return_url:  undefined,               // handled by onCompleted callback
            cancel_url:  undefined,               // handled by onDismissed callback
            notify_url:  API_BASE_URL + '/payment/notify',
            order_id:    data.order_id,
            items:       (bookingState.selectedService || 'Salon Service') + ' at ' + bookingState.salonName,
            amount:      data.amount,
            currency:    data.currency,
            hash:        data.hash,               // secure hash from Spring Boot
            first_name:  firstName,
            last_name:   lastName,
            email:       'customer@snipme.lk',
            phone:       '0771234567',
            address:     'Sri Lanka',
            city:        'Colombo',
            country:     'Sri Lanka'
        };

        console.log('Opening PayHere sandbox popup...');

        // Open real PayHere sandbox popup
        payhere.startPayment(payment);

        // Reset button — PayHere popup takes control now
        hideProcessingOverlay();
        resetConfirmBtn();
    })
    .catch(function(err) {
        console.error('Hash fetch failed:', err);
        hideProcessingOverlay();
        resetConfirmBtn();
        flashError('Cannot reach backend on port 8080. Start Spring Boot first, then try again.');
    });
}

function flashError(msg) {
    const el = document.getElementById('pgError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

// ─────────────────────────────────────────────────────────
// FINISH — show SNIP ME success screen
// ─────────────────────────────────────────────────────────
function finishBooking() {
    if (!bookingState.bookingID) bookingState.bookingID = 'BOOK-' + Date.now();

    const slot    = DUMMY_SLOTS.find(function(s) { return s.slotID === bookingState.selectedSlot; });
    const slotLbl = slot ? slot.label : '';
    const dateLbl = new Date(bookingState.selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Save to localStorage
    const bookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    bookings.push({
        bookingID:   bookingState.bookingID,
        salonName:   bookingState.salonName,
        service:     bookingState.selectedService,
        date:        bookingState.selectedDate,
        slotID:      bookingState.selectedSlot,
        paymentMethod: 'online',
        status:      'CONFIRMED',
        bookingDate: new Date().toISOString()
    });
    localStorage.setItem('userBookings', JSON.stringify(bookings));

    document.getElementById('confirmationDetails').innerHTML =
        '<div class="cd-row"><span>Booking ID</span><span>' + bookingState.bookingID + '</span></div>' +
        '<div class="cd-row"><span>Salon</span><span>'      + bookingState.salonName  + '</span></div>' +
        '<div class="cd-row"><span>Service</span><span>'   + (bookingState.selectedService || '-') + '</span></div>' +
        '<div class="cd-row"><span>Date</span><span>'      + dateLbl  + '</span></div>' +
        '<div class="cd-row"><span>Time</span><span>'      + slotLbl  + '</span></div>' +
        '<div class="cd-row"><span>Payment</span><span>Online (PayHere)</span></div>' +
        '<div class="cd-row cd-total"><span>Amount</span><span>' + AMOUNT_DISPLAY + '</span></div>';

    goToStep(4);
}

// ─────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────
function goToStep(n) {
    document.querySelectorAll('.step-content').forEach(function(c) { c.classList.remove('active'); });
    document.querySelectorAll('.step').forEach(function(s) { s.classList.remove('active'); });
    if (n === 4) {
        document.getElementById('successContent').classList.add('active');
    } else {
        document.getElementById('step' + n + '-content').classList.add('active');
        document.getElementById('step' + n).classList.add('active');
    }
}

function goToPreviousStep(n) { if (n > 1) goToStep(n - 1); }
function goBack()       { window.history.back(); }
function goToSettings() { window.location.href = 'settings.html?tab=bookings'; }
function goHome()       { window.location.href = '../index.html'; }