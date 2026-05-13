// ═══════════════════════════════════════════════════════════
//  SNIP ME — Booking JS
//  Fully connected to Spring Boot backend:
//  - Step 1: Loads salon + services from backend
//  - Step 2: Loads real time slots from backend, filtered by date
//  - Step 3: PayHere sandbox via backend hash endpoint
//  NOTE: API_BASE_URL comes from js/api-config.js


const CURRENCY = 'LKR';

let bookingState = {
    salonId:         null,
    salonName:       null,
    salonDetails:    null,
    selectedService: null,   // { serviceId, serviceName, price }
    selectedDate:    null,
    selectedSlot:    null,   // { slotID, label, startTime }
    customerID:      null,
    bookingID:       null,
    orderId:         null,
    allSlots:        [],     // all available slots from backend
    openingTime:     null,   // salon opening time (HH:mm:ss)
    closingTime:     null,   // salon closing time (HH:mm:ss)
    holidays:        []      // salon holidays (JSON array of dates: ["2026-03-20", "2026-03-21"])
};

function normalizeDateKey(value) {
    if (!value) {
        return '';
    }

    const text = String(value).trim();
    if (!text) {
        return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    if (text.includes('T')) {
        return text.split('T')[0];
    }

    return text;
}

function parseSalonHolidays(rawValue) {
    if (!rawValue) {
        return [];
    }

    const trimmed = String(rawValue).trim();
    if (!trimmed) {
        return [];
    }

    let values = [];
    if (trimmed.startsWith('[')) {
        try {
            values = JSON.parse(trimmed);
        } catch (error) {
            values = [];
        }
    } else {
        values = trimmed.split(/[;,\n]/);
    }

    return values
        .map(normalizeDateKey)
        .filter(Boolean);
}

function isSalonHoliday(dateValue) {
    const selectedKey = normalizeDateKey(dateValue);
    return bookingState.holidays.some(function (holiday) {
        return normalizeDateKey(holiday) === selectedKey;
    });
}

function setStep1NextState(isEnabled) {
    const nextButton = document.getElementById('nextBtn1');
    if (nextButton) {
        nextButton.disabled = !isEnabled;
    }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    bookingState.customerID = localStorage.getItem('customerID')
                           || sessionStorage.getItem('customerID')
                           || '1';

    const params = new URLSearchParams(window.location.search);
    bookingState.salonId = params.get('salonId')
                        || sessionStorage.getItem('selectedSalonId')
                        || null;

    // ── Date picker: tomorrow min, +7 days max ────────────
    const dateInput = document.getElementById('dateInput');
    const tomorrow  = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    maxDate.setHours(0, 0, 0, 0);
    dateInput.min = tomorrow.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
    dateInput.addEventListener('change', validateDate);
    dateInput.addEventListener('input', validateDate);

    const calendarBtn = document.getElementById('calendarBtn');
    if (calendarBtn) {
        calendarBtn.addEventListener('click', function () {
            dateInput.showPicker ? dateInput.showPicker() : dateInput.focus();
        });
    }

    // ── Load salon data from backend ──────────────────────
    if (bookingState.salonId) {
        loadSalonData(bookingState.salonId);
    } else {
        // Fallback if no salonId in URL
        document.getElementById('salonName').textContent        = 'SNIP ME Salon';
        document.getElementById('salonDescription').textContent = 'Professional salon services';
        document.getElementById('salonNameStep2').textContent   = 'at SNIP ME Salon';
        loadFallbackServices();
    }

    // Gateway back button
    const gatewayBackBtn = document.getElementById('gatewayBackBtn');
    if (gatewayBackBtn) {
        gatewayBackBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            hideGateway();
            goToStep(2);
        });
    }

    // ── Card field listeners ──────────────────────────────
    const pgCard = document.getElementById('pgCardNumber');
    if (pgCard) {
        pgCard.addEventListener('input', function () {
            const raw = this.value.replace(/\D/g, '').slice(0, 16);
            this.value = raw.match(/.{1,4}/g)?.join(' ') || raw;
            detectCardType(raw);
            validateFieldLive('number');
        });
        pgCard.addEventListener('blur', function () { validateFieldLive('number'); });
    }
    const pgExp = document.getElementById('pgExpiry');
    if (pgExp) {
        pgExp.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
            this.value = v;
            validateFieldLive('expiry');
        });
        pgExp.addEventListener('blur', function () { validateFieldLive('expiry'); });
    }
    const pgCVV = document.getElementById('pgCVV');
    if (pgCVV) {
        pgCVV.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 4);
            validateFieldLive('cvv');
        });
        pgCVV.addEventListener('blur', function () { validateFieldLive('cvv'); });
    }
    const pgName = document.getElementById('pgCardName');
    if (pgName) {
        pgName.addEventListener('input',  function () { validateFieldLive('name'); });
        pgName.addEventListener('blur',   function () { validateFieldLive('name'); });
    }

    // ── PayHere SDK setup ─────────────────────────────────
    setupPayHereHandlers();
});

// ─────────────────────────────────────────────────────────
// STEP 1 — Load Salon + Services from backend
// ─────────────────────────────────────────────────────────
function loadSalonData(salonId) {
    showStep1Loading(true);

    // Fetch salon details and services in parallel
    Promise.all([
        fetch(API_BASE_URL + '/public/salons/' + salonId).then(r => r.json()),
        fetch(API_BASE_URL + '/public/salons/' + salonId + '/services').then(r => r.json())
    ])
    .then(function (results) {
        const salon    = results[0];
        const services = results[1];

        // Store salon info
        bookingState.salonName    = salon.name    || 'SNIP ME Salon';
        bookingState.salonDetails = salon.details || 'Professional salon services';
        // Store opening/closing times if backend provides them
        bookingState.openingTime = salon.openingTime || salon.opening_time || bookingState.openingTime;
        bookingState.closingTime = salon.closingTime || salon.closing_time || bookingState.closingTime;
        
        // Parse and store holidays whether the backend sends JSON or comma-separated text
        bookingState.holidays = parseSalonHolidays(salon.holidays);

        validateDate();

        // Update UI
        document.getElementById('salonName').textContent        = bookingState.salonName;
        document.getElementById('salonDescription').textContent = bookingState.salonDetails;
        document.getElementById('salonNameStep2').textContent   = 'at ' + bookingState.salonName;

        // Populate services dropdown with name + price
        const serviceSelect = document.getElementById('serviceSelect');
        serviceSelect.innerHTML = '<option value="">-- Select a service --</option>';

        if (services && services.length > 0) {
            services.forEach(function (s) {
                const option = document.createElement('option');
                option.value = JSON.stringify({ serviceId: s.serviceId, serviceName: s.serviceName, price: s.price });
                option.textContent = s.serviceName + ' — Rs. ' + Number(s.price).toLocaleString('en-US', { minimumFractionDigits: 2 });
                serviceSelect.appendChild(option);
            });
        } else {
            loadFallbackServices();
        }

        serviceSelect.addEventListener('change', updateServiceDisplay);
        showStep1Loading(false);
    })
    .catch(function (err) {
        console.error('Failed to load salon data:', err);
        // Fallback if backend not reachable
        document.getElementById('salonName').textContent        = 'SNIP ME Salon';
        document.getElementById('salonDescription').textContent = 'Professional salon services';
        document.getElementById('salonNameStep2').textContent   = 'at SNIP ME Salon';
        bookingState.salonName = 'SNIP ME Salon';
        loadFallbackServices();
        showStep1Loading(false);
    });
}

function loadFallbackServices() {
    // Used when backend not available or no services configured
    const fallback = [
        { serviceId: 1, serviceName: 'Haircut',    price: 1500 },
        { serviceId: 2, serviceName: 'Beard Trim', price: 800  },
        { serviceId: 3, serviceName: 'Styling',    price: 2000 },
        { serviceId: 4, serviceName: 'Hair Wash',  price: 600  },
        { serviceId: 5, serviceName: 'Hair Color', price: 3500 }
    ];
    const serviceSelect = document.getElementById('serviceSelect');
    serviceSelect.innerHTML = '<option value="">-- Select a service --</option>';
    fallback.forEach(function (s) {
        const option = document.createElement('option');
        option.value = JSON.stringify({ serviceId: s.serviceId, serviceName: s.serviceName, price: s.price });
        option.textContent = s.serviceName + ' — Rs. ' + Number(s.price).toLocaleString('en-US', { minimumFractionDigits: 2 });
        serviceSelect.appendChild(option);
    });
    serviceSelect.addEventListener('change', updateServiceDisplay);
}

function showStep1Loading(isLoading) {
    const btn = document.querySelector('#step1-content .btn-primary');
    if (btn) btn.disabled = isLoading;
}

function updateServiceDisplay() {
    const raw = document.getElementById('serviceSelect').value;
    if (!raw) {
        bookingState.selectedService = null;
        document.getElementById('selectedServiceDisplay').textContent = 'None selected';
        return;
    }
    bookingState.selectedService = JSON.parse(raw);
    document.getElementById('selectedServiceDisplay').textContent =
        'Selected: ' + bookingState.selectedService.serviceName;
}

function validateDate() {
    const inp = document.getElementById('dateInput');
    const err = document.getElementById('dateError');
    if (!inp.value) {
        err.textContent = 'Please select a date';
        setStep1NextState(false);
        return false;
    }

    // Prevent today from being selected (must book from tomorrow onwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    if (inp.value === todayStr) {
        err.textContent = 'Cannot book for today. Please select from tomorrow onwards';
        setStep1NextState(false);
        return false;
    }

    const sel      = new Date(inp.value + 'T00:00:00');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const maxDate  = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);

    if (sel < tomorrow) {
        err.textContent = 'Please select from tomorrow onwards';
        setStep1NextState(false);
        return false;
    }
    if (sel > maxDate)  {
        err.textContent = 'Cannot book more than 7 days ahead';
        setStep1NextState(false);
        return false;
    }

    // Check if selected date is a salon holiday
    if (isSalonHoliday(inp.value)) {
        err.textContent = 'Salon is closed on this date. Please select another date.';
        setStep1NextState(false);
        return false;
    }

    err.textContent = '';
    bookingState.selectedDate = inp.value;
    setStep1NextState(true);
    return true;
}

function proceedToSlots() {
    if (!bookingState.selectedService) { alert('Please select a service'); return; }
    if (!validateDate()) return;
    goToStep(2);
    loadAvailableSlots();
}

// ─────────────────────────────────────────────────────────
// STEP 2 — Load Real Time Slots from backend
// ─────────────────────────────────────────────────────────
function loadAvailableSlots() {
    const grid = document.getElementById('timeSlotsGrid');
    grid.innerHTML = '<p class="loading">Loading available slots...</p>';
    document.getElementById('nextBtn2').disabled = true;

    if (!bookingState.salonId || !bookingState.selectedDate) {
        grid.innerHTML = '<p class="no-slots" style="color:#ff6b6b;">Salon/date not selected.</p>';
        return;
    }

    // Fetch both the backend's available slots and all known slots (to detect booked ones).
    const availEndpoint = API_BASE_URL
        + '/bookings/available-by-salon?salonId=' + encodeURIComponent(bookingState.salonId)
        + '&date=' + encodeURIComponent(bookingState.selectedDate);
    const allEndpoint = API_BASE_URL + '/bookings/all';

    Promise.all([
        fetch(availEndpoint).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(allEndpoint).then(r => r.ok ? r.json() : []).catch(() => [])
    ])
    .then(function (results) {
        const avail = results[0] || [];
        const all   = results[1] || [];
        bookingState.allSlots = avail;
        // Build quick maps of existing slots for the selected salon+date
        const occupied = {}; // times that are NOT AVAILABLE
        const availableMap = {}; // times that are AVAILABLE with slotID

        all.forEach(function (s) {
            try {
                // s.startTime expected like "2026-04-28T09:00:00"
                const key = s.startTime;
                if (!key) return;
                // ensure salon filter
                if (!s.salon || !s.salon.salonID) return;
                if (String(s.salon.salonID) !== String(bookingState.salonId)) return;
                const datePart = key.split('T')[0];
                if (datePart !== bookingState.selectedDate) return;
                if (s.status && s.status !== 'AVAILABLE') occupied[key] = s;
                if (s.status === 'AVAILABLE') availableMap[key] = s;
            } catch (e) { /* ignore malformed items */ }
        });

        // Now generate hourly slots based on salon opening/closing times
        filterAndDisplayGeneratedSlots(availableMap, occupied, bookingState.selectedDate);
    })
    .catch(function (err) {
        console.error('Failed to load slots:', err);
        grid.innerHTML = '<p class="no-slots" style="color:#ff6b6b;">Could not load time slots. Please check your connection and try again.</p>';
    });
}

function filterAndDisplaySlots(slots, selectedDate) {
    // Deprecated by generated slots flow — retained for compatibility
    filterAndDisplayGeneratedSlots({}, {}, selectedDate);
}

function filterAndDisplayGeneratedSlots(availableMap, occupiedMap, selectedDate) {
    const grid = document.getElementById('timeSlotsGrid');
    grid.innerHTML = '';

    // Determine opening/closing times (HH:mm:ss). Fallback if missing.
    const opening = bookingState.openingTime || '09:00:00';
    const closing = bookingState.closingTime || '17:00:00';

    // Parse HH:mm:ss
    function parseHM(t) {
        const parts = (t || '00:00:00').split(':');
        return { h: parseInt(parts[0]||'0',10), m: parseInt(parts[1]||'0',10) };
    }

    const op = parseHM(opening);
    const cl = parseHM(closing);

    // Build JS Dates in local (no timezone suffix) by using the selectedDate
    const start = new Date(selectedDate + 'T' + padTime(op.h) + ':' + padTime(op.m) + ':00');
    const end   = new Date(selectedDate + 'T' + padTime(cl.h) + ':' + padTime(cl.m) + ':00');

    if (start >= end) {
        grid.innerHTML = '<p class="no-slots">Salon has invalid opening/closing times configured.</p>';
        document.getElementById('nextBtn2').disabled = true;
        return;
    }

    let any = false;
    for (let t = new Date(start.getTime()); t < end; t.setHours(t.getHours() + 1)) {
        const hh = padTime(t.getHours());
        const mm = padTime(t.getMinutes());
        const isoLocal = selectedDate + 'T' + hh + ':' + mm + ':00';
        const label = hh + ':' + mm + ' - ' + padTime((t.getHours()+1)%24) + ':' + mm;

        // If there is an AVAILABLE slot row in DB for this time, prefer that slotID
        if (availableMap[isoLocal]) {
            const s = availableMap[isoLocal];
            grid.appendChild(createGeneratedSlotElement({ slotID: s.slotID, label: label, startTime: isoLocal, state: 'available' }));
            any = true;
            continue;
        }

        // If DB shows occupied/locked/booked → show as taken
        if (occupiedMap[isoLocal]) {
            grid.appendChild(createGeneratedSlotElement({ slotID: occupiedMap[isoLocal].slotID, label: label, startTime: isoLocal, state: 'taken' }));
            any = true;
            continue;
        }

        // No DB row exists → treat as virtual available
        grid.appendChild(createGeneratedSlotElement({ slotID: null, label: label, startTime: isoLocal, state: 'virtual' }));
        any = true;
    }

    if (!any) {
        grid.innerHTML = '<p class="no-slots">No available slots for ' + formatDateDisplay(selectedDate) + '.<br>Please try another date.</p>';
        document.getElementById('nextBtn2').disabled = true;
        return;
    }

    document.getElementById('nextBtn2').disabled = true;
}

function createGeneratedSlotElement(slot) {
    // slot: { slotID, label, startTime, state: 'available'|'taken'|'virtual' }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'time-slot';

    const inner = document.createElement('div');
    inner.className = 'slot-inner';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'slot-time';
    timeSpan.textContent = slot.label;
    inner.appendChild(timeSpan);

    const durSpan = document.createElement('span');
    durSpan.className = 'slot-duration';
    durSpan.textContent = '60 min';
    inner.appendChild(durSpan);

    if (slot.state === 'taken') {
        button.classList.add('taken');
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.appendChild(inner);
        const badge = document.createElement('span'); badge.className = 'slot-badge'; badge.textContent = 'Booked'; button.appendChild(badge);
        // not clickable
    } else {
        // available (either real DB slot or virtual)
        button.classList.add(slot.state === 'virtual' ? 'virtual-available' : 'available');
        button.appendChild(inner);
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'timeSlot'; input.id = 'ts' + (slot.slotID || 'v' + slot.startTime.replace(/[:T]/g,''));
        input.value = slot.slotID || '';
        button.prepend(input);

        button.addEventListener('click', function () {
            document.querySelectorAll('.time-slot').forEach(function (s) { s.classList.remove('selected'); });
            button.classList.add('selected');
            bookingState.selectedSlot = { slotID: slot.slotID, label: slot.label, startTime: slot.startTime, virtual: slot.slotID == null };
            document.getElementById('nextBtn2').disabled = false;
        });
    }

    return button;
}

function createSlotElement(slot) {
    // Parse startTime "2026-04-28T09:00:00" → "09:00 - 09:30"
    const start     = new Date(slot.startTime);
    const end       = new Date(start.getTime() + 30 * 60000); // +30 min
    const startStr  = padTime(start.getHours()) + ':' + padTime(start.getMinutes());
    const endStr    = padTime(end.getHours())   + ':' + padTime(end.getMinutes());
    const label     = startStr + ' - ' + endStr;

    const div = document.createElement('div');
    div.className = 'time-slot';
    div.innerHTML =
        '<input type="radio" name="timeSlot" value="' + slot.slotID + '" id="ts' + slot.slotID + '">' +
        '<label for="ts' + slot.slotID + '">' +
            '<span class="slot-time">' + label + '</span>' +
            '<span class="slot-duration">30 min</span>' +
        '</label>';

    div.addEventListener('click', function () {
        document.querySelectorAll('.time-slot').forEach(function (s) { s.classList.remove('selected'); });
        div.classList.add('selected');
        bookingState.selectedSlot = { slotID: slot.slotID, label: label, startTime: slot.startTime };
        document.getElementById('nextBtn2').disabled = false;
    });

    return div;
}

function padTime(n) { return n.toString().padStart(2, '0'); }

function formatDateDisplay(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// ─────────────────────────────────────────────────────────
// STEP 3 — PAYMENT
// ─────────────────────────────────────────────────────────
function proceedToPayment() {
    if (!bookingState.selectedSlot) { alert('Please select a time slot'); return; }
    goToStep(3);
    fillSummaries();
    showGateway();
}

function getAmountDisplay() {
    if (bookingState.selectedService && bookingState.selectedService.price) {
        return 'Rs. ' + Number(bookingState.selectedService.price).toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
    return 'Rs. 0.00';
}

function getAmountValue() {
    if (bookingState.selectedService && bookingState.selectedService.price) {
        return Number(bookingState.selectedService.price).toFixed(2);
    }
    return '0.00';
}

function fillSummaries() {
    const slotLbl   = bookingState.selectedSlot ? bookingState.selectedSlot.label : '';
    const dateLbl   = formatDateDisplay(bookingState.selectedDate);
    const svcName   = bookingState.selectedService ? bookingState.selectedService.serviceName : '-';
    const amtDisplay = getAmountDisplay();

    // Gateway box
    document.getElementById('pgSummService').textContent = svcName;
    document.getElementById('pgSummDate').textContent    = dateLbl;
    document.getElementById('pgSummTime').textContent    = slotLbl;
    document.getElementById('pgSummTotal').textContent   = amtDisplay;
    document.getElementById('pgBtnAmount').textContent   = amtDisplay;
}

function showMainBox() {
    hideGateway();
}

function showGateway() {
    document.getElementById('paymentGateway').style.display = 'block';
    clearGatewayErrors();
    hideProcessingOverlay();
}

function hideGateway() {
    document.getElementById('paymentGateway').style.display = 'none';
}

function proceedToGateway() { showGateway(); }

// ─────────────────────────────────────────────────────────
// PAYHERE SANDBOX
// ─────────────────────────────────────────────────────────
function setupPayHereHandlers() {
    if (typeof payhere === 'undefined') {
        setTimeout(setupPayHereHandlers, 300);
        return;
    }

    payhere.onCompleted = function onCompleted(orderId) {
        console.log('PayHere completed. OrderID:', orderId);
        confirmBookingInBackend();
    };

    payhere.onDismissed = function onDismissed() {
        console.log('PayHere dismissed');
        hideProcessingOverlay();
        resetConfirmBtn();
        flashError('Payment was cancelled. You can try again.');
    };

    payhere.onError = function onError(error) {
        console.error('PayHere error:', error);
        hideProcessingOverlay();
        resetConfirmBtn();
        flashError('Payment error. Please try again.');
    };
}

function resetConfirmBtn() {
    const btn = document.getElementById('pgConfirmBtn');
    if (btn) {
        btn.disabled  = false;
        btn.classList.remove('loading-state');
        btn.innerHTML = 'Confirm Booking — <span id="pgBtnAmount">' + getAmountDisplay() + '</span>';
    }
    document.querySelector('.pg-card-block')?.classList.remove('processing-disabled');
}

// ─────────────────────────────────────────────────────────
// CONFIRM IN SPRING BOOT after PayHere success
// Uses existing /api/bookings/confirm
// ─────────────────────────────────────────────────────────
function confirmBookingInBackend() {
    const slotID     = bookingState.selectedSlot && bookingState.selectedSlot.slotID;
    const customerID = bookingState.customerID;

    if (!slotID) {
        // Virtual slot (no DB slot row existed). We don't have a slotID to confirm on the server.
        // For now, treat as local success (frontend persisted booking) and finish.
        finishBooking();
        return;
    }

    fetch(API_BASE_URL + '/bookings/confirm?slotID=' + slotID + '&customerID=' + customerID, {
        method: 'POST'
    })
    .then(function (res) { return res.text(); })
    .then(function (data) {
        console.log('Backend confirmed:', data);
        // Backend now confirms using Slot ID; keep a UI booking id value as fallback.
        const slotMatch = data.match(/Slot ID:\s*(\d+)/i);
        if (slotMatch) {
            bookingState.bookingID = 'SLOT-' + slotMatch[1];
        }
        finishBooking();
    })
    .catch(function (err) {
        console.error('Backend confirm error:', err);
        finishBooking(); // Payment done — still show success
    });
}

// ─────────────────────────────────────────────────────────
// ONLINE PAYMENT — validate → get hash → open PayHere popup
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
    if (typeof showLoader === 'function') {
        showLoader();
    }

    bookingState.orderId = 'SNIPME-' + Date.now();
    const amount = getAmountValue();

    // Step 1: Lock the slot using PESSIMISTIC_WRITE lock from backend
    // Backend uses lockSlotForBooking() which does a DB-level row lock
    // If slot taken by another customer → backend returns 409 CONFLICT → we stop
    // If this is a virtual slot (no DB slot row exists yet), skip locking and go straight to payment
    const initiatePromise = (bookingState.selectedSlot && bookingState.selectedSlot.slotID == null)
        ? Promise.resolve(null)
        : fetch(API_BASE_URL + '/bookings/initiate?slotID=' + bookingState.selectedSlot.slotID
            + '&customerID=' + bookingState.customerID, { method: 'POST' });

    initiatePromise
    .then(function (res) {
        if (res && res.status === 409) {
            // Another customer just locked this slot
            throw new Error('SLOT_TAKEN');
        }
        if (res && !res.ok) {
            throw new Error('INITIATE_FAILED');
        }
        // Slot locked successfully (or virtual) — now get PayHere hash from backend
        return fetch(API_BASE_URL + '/payment/hash'
            + '?orderId='  + bookingState.orderId
            + '&amount='   + amount
            + '&currency=' + CURRENCY);
    })
    .then(function (res) {
        if (!res.ok) throw new Error('Hash backend returned ' + res.status);
        return res.json();
    })
    .then(function (data) {
        if (typeof hideLoader === 'function') {
            hideLoader();
        }
        const cardName  = document.getElementById('pgCardName').value.trim();
        const nameParts = cardName.split(' ');
        const firstName = nameParts[0] || 'Customer';
        const lastName  = nameParts.slice(1).join(' ') || 'User';

        const payment = {
            sandbox:     true,
            merchant_id: data.merchant_id,
            return_url:  undefined,
            cancel_url:  undefined,
            notify_url:  API_BASE_URL + '/payment/notify',
            order_id:    data.order_id,
            items:       (bookingState.selectedService ? bookingState.selectedService.serviceName : 'Salon Service')
                         + ' at ' + (bookingState.salonName || 'SNIP ME'),
            amount:      data.amount,
            currency:    data.currency,
            hash:        data.hash,
            first_name:  firstName,
            last_name:   lastName,
            email:       'customer@snipme.lk',
            phone:       '0771234567',
            address:     'Sri Lanka',
            city:        'Colombo',
            country:     'Sri Lanka'
        };

        console.log('Opening PayHere sandbox popup...');
        payhere.startPayment(payment);

        hideProcessingOverlay();
        resetConfirmBtn();
    })
    .catch(function (err) {
        console.error('Payment init failed:', err);
        if (typeof hideLoader === 'function') {
            hideLoader();
        }
        hideProcessingOverlay();
        resetConfirmBtn();
        if (err.message === 'SLOT_TAKEN') {
            // Go back to step 2 and show error
            flashError('Sorry! This slot was just booked by someone else. Please go back and select another time slot.');
            setTimeout(function () {
                goToStep(2);
                hideGateway();
                loadAvailableSlots(); // Refresh slots from backend
            }, 3000);
        } else if (err.message === 'INITIATE_FAILED') {
            flashError('Could not lock this time slot. Please try again.');
        } else {
            flashError('Cannot reach backend on port 8080. Start Spring Boot first, then try again.');
        }
    });
}

// ─────────────────────────────────────────────────────────
// CARD FIELD VALIDATION
// ─────────────────────────────────────────────────────────
function detectCardType(raw) {
    let type = '';
    if (/^4/.test(raw))            type = 'visa';
    else if (/^5[1-5]/.test(raw))  type = 'mc';
    else if (/^3[47]/.test(raw))   type = 'amex';
    else if (/^6/.test(raw))       type = 'discover';
    document.querySelectorAll('.card-icon-item').forEach(function (el) {
        el.classList.toggle('dim',    !(!type || el.dataset.card === type));
        el.classList.toggle('active',  !type || el.dataset.card === type);
    });
}

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

function validateFieldLive(field) {
    if (field === 'name')   return setFieldState('pgCardName',   'nameError',   document.getElementById('pgCardName').value.trim().length >= 2,   'Enter name on card.');
    if (field === 'number') return setFieldState('pgCardNumber', 'numberError', document.getElementById('pgCardNumber').value.replace(/\s/g,'').length === 16, 'Must be 16 digits.');
    if (field === 'expiry') return setFieldState('pgExpiry',     'expiryError', /^\d{2}\/\d{2}$/.test(document.getElementById('pgExpiry').value), 'Use MM/YY format.');
    if (field === 'cvv')    return setFieldState('pgCVV',        'cvvError',    document.getElementById('pgCVV').value.length >= 3, 'Min 3 digits.');
    return true;
}

function clearGatewayErrors() {
    const pgError = document.getElementById('pgError');
    if (pgError) { pgError.textContent = ''; pgError.classList.remove('shake'); }
    ['pgCardName','pgCardNumber','pgExpiry','pgCVV'].forEach(function (id) {
        document.getElementById(id)?.classList.remove('valid','invalid');
    });
    ['nameError','numberError','expiryError','cvvError'].forEach(function (id) {
        const el = document.getElementById(id); if (el) el.textContent = '';
    });
}

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

function flashError(msg) {
    const el = document.getElementById('pgError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

// ─────────────────────────────────────────────────────────
// SUCCESS SCREEN
// ─────────────────────────────────────────────────────────
function finishBooking() {
    if (!bookingState.bookingID) bookingState.bookingID = 'BOOK-' + Date.now();

    const slotLbl    = bookingState.selectedSlot ? bookingState.selectedSlot.label : '';
    const dateLbl    = formatDateDisplay(bookingState.selectedDate);
    const svcName    = bookingState.selectedService ? bookingState.selectedService.serviceName : '-';
    const amtDisplay = getAmountDisplay();

    const bookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    bookings.push({
        bookingID:     bookingState.bookingID,
        salonName:     bookingState.salonName,
        service:       svcName,
        date:          bookingState.selectedDate,
        slotID:        bookingState.selectedSlot ? bookingState.selectedSlot.slotID : null,
        paymentMethod: 'online',
        status:        'CONFIRMED',
        bookingDate:   new Date().toISOString()
    });
    localStorage.setItem('userBookings', JSON.stringify(bookings));

    document.getElementById('confirmationDetails').innerHTML =
        '<div class="cd-row"><span>Booking ID</span><span>'  + bookingState.bookingID        + '</span></div>' +
        '<div class="cd-row"><span>Salon</span><span>'       + (bookingState.salonName || '-')+ '</span></div>' +
        '<div class="cd-row"><span>Service</span><span>'     + svcName                        + '</span></div>' +
        '<div class="cd-row"><span>Date</span><span>'        + dateLbl                        + '</span></div>' +
        '<div class="cd-row"><span>Time</span><span>'        + slotLbl                        + '</span></div>' +
        '<div class="cd-row"><span>Payment</span><span>Online (PayHere)</span></div>'          +
        '<div class="cd-row cd-total"><span>Amount</span><span>' + amtDisplay + '</span></div>';

    goToStep(4);
}

// ─────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────
function goToStep(n) {
    document.querySelectorAll('.step-content').forEach(function (c) { c.classList.remove('active'); });
    document.querySelectorAll('.step').forEach(function (s) { s.classList.remove('active'); });
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