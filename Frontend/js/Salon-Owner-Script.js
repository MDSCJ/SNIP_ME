let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

const OWNER_NAME_KEY = "snipmeOwnerName";
const OWNER_SALON_NAME_KEY = "snipmeOwnerSalonName";
const OWNER_SALON_ID_KEY = "snipmeOwnerSalonId";
const OWNER_EMAIL_KEY = "snipmeOwnerEmail";
const OWNER_TOKEN_KEY = "snipmeOwnerToken";
let ownerProfilePhotoLowQuality = "";
let ownerWorkingDaysCache = "";
let ownerLocationMapInstance = null;
let ownerLocationMarker = null;
let ownerSelectedLatLng = null;


// ─── Notifications ────────────────────────────────────
const NOTIFICATIONS = [];
let ownerSalonId = null;

function getNotifTypeTag(type) {
    const t = String(type || '').toUpperCase();
    if (t.includes('BOOKING')) return 'apt';
    if (t.includes('SERVICE')) return 'svc';
    return 'sys';
}

function toRelativeTime(dateValue) {
    if (!dateValue) return 'Just now';
    const dt = new Date(dateValue);
    if (Number.isNaN(dt.getTime())) return 'Just now';
    const diffMs = Date.now() - dt.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days + 'd ago';
}

function mapBackendNotification(item) {
    const typeTag = getNotifTypeTag(item && item.type);
    const avatarMap = { apt: 'AP', svc: 'SV', sys: 'SY' };
    return {
        id: item && item.id,
        type: typeTag,
        avatar: avatarMap[typeTag] || 'SY',
        title: item && item.type ? String(item.type).replaceAll('_', ' ') : 'Notification',
        sub: item && item.message ? item.message : 'No details',
        time: toRelativeTime(item && item.createdAt),
        unread: !(item && item.isRead)
    };
}

function reloadNotificationsFromServer() {
    if (!ownerSalonId || typeof API_BASE_URL === 'undefined') return Promise.resolve();
    return fetch(API_BASE_URL + '/salon-owner/notifications/' + encodeURIComponent(ownerSalonId), {
        method: 'GET',
        headers: getAuthHeaders()
    })
    .then(function (res) {
        if (!res.ok) throw new Error('Failed to fetch notifications (' + res.status + ')');
        return res.json();
    })
    .then(function (rows) {
        NOTIFICATIONS.length = 0;
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            NOTIFICATIONS.push(mapBackendNotification(row));
        });
        renderNotifPanel();
        renderNotifCenter();
        updateBadge();
    })
    .catch(function (err) {
        console.warn('Notification sync failed:', err && err.message ? err.message : err);
    });
}

function getUnreadCount() {
    return NOTIFICATIONS.filter(n => n.unread).length;
}

function updateBadge() {
    const count = getUnreadCount();
    const badge = document.getElementById('notifBadge');
    const siBadge = document.getElementById('sidebarBadge');
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
        if (siBadge) { siBadge.textContent = count; siBadge.style.display = 'flex'; }
    } else {
        badge.style.display = 'none';
        if (siBadge) siBadge.style.display = 'none';
    }
}

function buildNotifItem(n, full = false) {
    const el = document.createElement('div');
    el.className = 'notif-item' + (full ? ' notif-center-item' : '') + (n.unread ? ' unread' : '');
    el.innerHTML = `
        <div class="notif-avatar ${n.type}">${n.avatar}</div>
        <div class="notif-content">
            <div class="notif-title">${n.title}</div>
            <div class="notif-sub">${n.sub}</div>
            <div class="notif-time">${n.time}</div>
        </div>`;
    el.addEventListener('click', () => {
        if (!n.unread || !n.id) {
            n.unread = false;
            updateBadge();
            renderNotifPanel();
            renderNotifCenter();
            return;
        }

        fetch(API_BASE_URL + '/salon-owner/notifications/' + encodeURIComponent(n.id) + '/read', {
            method: 'PUT',
            headers: getAuthHeaders()
        })
        .then(function (res) {
            if (!res.ok) throw new Error('Failed to mark as read');
            n.unread = false;
            updateBadge();
            renderNotifPanel();
            renderNotifCenter();
        })
        .catch(function () {
            // fallback to local visual state even if API fails
            n.unread = false;
            updateBadge();
            renderNotifPanel();
            renderNotifCenter();
        });
    });
    return el;
}

function renderNotifPanel() {
    const list = document.getElementById('notifList');
    if (!list) return;
    list.innerHTML = '';
    const slice = NOTIFICATIONS.slice(0, 5);
    if (slice.length === 0) {
        list.innerHTML = '<div style="padding:24px;text-align:center;color:#555;font-size:13px;">No notifications</div>';
    } else {
        slice.forEach(n => list.appendChild(buildNotifItem(n)));
    }
}

function renderNotifCenter() {
    const list = document.getElementById('notif-center-list');
    if (!list) return;
    list.innerHTML = '';
    if (NOTIFICATIONS.length === 0) {
        list.innerHTML = '<div style="padding:24px;text-align:center;color:#555;font-size:13px;">No notifications yet</div>';
        return;
    }
    NOTIFICATIONS.forEach(n => list.appendChild(buildNotifItem(n, true)));
}

// Call this from anywhere to push a new notification
function pushNotification(title, sub, type = 'sys') {
    const avatarMap = { apt: 'AP', svc: 'SV', sys: 'SY' };
    NOTIFICATIONS.unshift({
        id: Date.now(),
        type,
        avatar: avatarMap[type] || 'SY',
        title,
        sub,
        time: 'Just now',
        unread: true
    });
    updateBadge();
    renderNotifPanel();
}

function setupNotificationBell() {
    const bellBtn = document.getElementById('bellBtn');
    const notifPanel = document.getElementById('notifPanel');
    const bellWrap = document.getElementById('bellWrap');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const seeAllBtn = document.getElementById('seeAllBtn');
    const clearAllBtn = document.getElementById('clearAllNotifsBtn');

    if (!bellBtn || !notifPanel) return;

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (bellWrap && !bellWrap.contains(e.target)) {
            notifPanel.classList.remove('open');
        }
    });

    notifPanel.addEventListener('click', e => e.stopPropagation());

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!ownerSalonId) {
                NOTIFICATIONS.forEach(n => n.unread = false);
                updateBadge();
                renderNotifPanel();
                renderNotifCenter();
                return;
            }

            fetch(API_BASE_URL + '/salon-owner/notifications/' + encodeURIComponent(ownerSalonId) + '/mark-all-read', {
                method: 'PUT',
                headers: getAuthHeaders()
            })
            .then(function (res) {
                if (!res.ok) throw new Error('Failed to mark all read');
                NOTIFICATIONS.forEach(n => n.unread = false);
                updateBadge();
                renderNotifPanel();
                renderNotifCenter();
            })
            .catch(function () {
                NOTIFICATIONS.forEach(n => n.unread = false);
                updateBadge();
                renderNotifPanel();
                renderNotifCenter();
            });
        });
    }

    if (seeAllBtn) {
        seeAllBtn.addEventListener('click', () => {
            notifPanel.classList.remove('open');
            document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const notifSection = document.getElementById('notifications-section');
            const notifNavLink = document.querySelector('[data-target="notifications-section"]');
            if (notifSection) notifSection.style.display = 'block';
            if (notifNavLink) notifNavLink.classList.add('active');
            renderNotifCenter();
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (!ownerSalonId) {
                NOTIFICATIONS.length = 0;
                updateBadge();
                renderNotifPanel();
                renderNotifCenter();
                return;
            }

            const jobs = NOTIFICATIONS
                .filter(function (n) { return !!n.id; })
                .map(function (n) {
                    return fetch(API_BASE_URL + '/salon-owner/notifications/' + encodeURIComponent(n.id), {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    }).catch(function () { return null; });
                });

            Promise.all(jobs).finally(function () {
                NOTIFICATIONS.length = 0;
                updateBadge();
                renderNotifPanel();
                renderNotifCenter();
            });
        });
    }

    renderNotifPanel();
    updateBadge();
}
// ────────────────────────────────────────────────────── Notifications ────────────────────────────────────────────────────── 

// Helper function to get authorization headers
function getAuthHeaders() {
    const token = localStorage.getItem(OWNER_TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

const sriLankaBounds = (typeof L !== 'undefined')
    ? L.latLngBounds(L.latLng(5.85, 79.45), L.latLng(10.05, 81.98))
    : null;
const sriLankaCenter = (typeof L !== 'undefined')
    ? L.latLng(7.8731, 80.7718)
    : { lat: 7.8731, lng: 80.7718 };


const realToday = new Date().getDate();
const realMonth = new Date().getMonth();
const realYear = new Date().getFullYear();

// tracking user clicked days 
let currentSelectedDay = realToday;
let holidays = [];
let appointments = [];

function formatDateKey(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
}

function getSelectedDateObject() {
    return new Date(currentYear, currentMonth, currentSelectedDay);
}

function getBookingWindowDateObjects() {
    const dates = [];
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (let i = 0; i < 7; i++) {
        const next = new Date(tomorrow);
        next.setDate(tomorrow.getDate() + i);
        dates.push(next);
    }

    return dates;
}

function isInBookingWindow(dateObj) {
    const testDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const windowDates = getBookingWindowDateObjects();
    return windowDates.some(function (d) {
        return d.getTime() === testDate.getTime();
    });
}

function isHolidayForDate(day, month, year) {
    const key = formatDateKey(new Date(year, month, day));
    return holidays.includes(key);
}

function removePastHolidays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = formatDateKey(today);
    
    const filteredHolidays = holidays.filter(function (dateKey) {
        return dateKey >= todayKey;
    });
    
    if (filteredHolidays.length !== holidays.length) {
        holidays = filteredHolidays;
        return true; // indicates cleanup was performed
    }
    return false;
}

function computeWorkingDaysString() {
    const windowKeys = getBookingWindowDateObjects().map(formatDateKey);
    const workingDays = windowKeys.filter(function (dateKey) {
        return !holidays.includes(dateKey);
    });
    return workingDays.join(',');
}

function syncWorkingDaysToServer() {
    const ownerEmail = localStorage.getItem(OWNER_EMAIL_KEY);
    const authBaseUrl = (typeof AUTH_BASE_URL !== 'undefined' && AUTH_BASE_URL)
        ? AUTH_BASE_URL
        : ((typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ? (API_BASE_URL + '/auth') : '');

    if (!ownerEmail || !authBaseUrl) {
        console.error('Sync failed: Missing email or API URL');
        return Promise.reject(new Error('Owner session or auth API URL is missing.'));
    }

    removePastHolidays(); // Clean up any past holidays before syncing
    const holidaysString = holidays.join(',');
    ownerWorkingDaysCache = holidaysString;

    const requestPayload = {
        email: ownerEmail,
        holidays: holidaysString
    };
    
    console.log('Syncing holidays to server:', requestPayload);

    return fetch(authBaseUrl + '/owner-working-days', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
    }).then(function (response) {
        console.log('Sync response status:', response.status, response.statusText);
        if (!response.ok) {
            return response.text().then(function (bodyText) {
                console.error('Sync error response:', bodyText);
                throw new Error('Failed to update holidays (' + response.status + '): ' + (bodyText || 'Unknown error'));
            });
        }
        return response.json();
    }).then(function (data) {
        console.log('Sync success response:', data);
        if (data && typeof data.holidays === 'string') {
            ownerWorkingDaysCache = data.holidays;
            console.log('Updated holidays cache:', ownerWorkingDaysCache);
        }
        return data;
    }).catch(function (error) {
        console.error('Sync request failed:', error.message || error);
        throw error;
    });
}

// Calendar part
function CalenderBuild() {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayRef = new Date(realYear, realMonth, realToday);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const monthDisplay = document.getElementById('monthDisplay');
    if (monthDisplay) {
        monthDisplay.innerText = `${monthNames[currentMonth]} ${currentYear}`;
    }

    for (let i = 0; i < 35; i++) {
        const slot = document.getElementById(`slot-${i}`);
        if (!slot) continue;

        slot.innerHTML = "";
        slot.className = "day-box";
        slot.onclick = null; 

        if (i < firstDayIndex || i >= (firstDayIndex + daysInMonth)) {
            slot.innerHTML = '<i class="fas fa-scissors"></i>';
            slot.classList.add('slot-empty');
        } else {
            const dateNum = i - firstDayIndex + 1;
            const slotDate = new Date(currentYear, currentMonth, dateNum);
            const isPastDate = slotDate < todayRef;
            slot.innerHTML = '<span class="date-num">' + dateNum + '</span>';

            if (isHolidayForDate(dateNum, currentMonth, currentYear)) {
                slot.classList.add('is-holiday');
            } else {
                slot.classList.add('slot-free'); 
            }

            if (dateNum === realToday && currentMonth === realMonth && currentYear === realYear) {
                slot.classList.add('is-today');
            }

            if (currentSelectedDay !== null && dateNum === currentSelectedDay) {
                slot.classList.add('is-selected');
            }

            if (isPastDate) {
                slot.classList.add('is-past');
            } else {
                slot.onclick = () => selectDate(dateNum);
            }
        }
    } 
}

// real time clock 
function startLiveClock() {
    setInterval(() => {
        const now = new Date();
       
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        const timeEl = document.getElementById('current-time');
        if (timeEl) timeEl.innerText = timeString;


        const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
        const fullDateEl = document.getElementById('full-date-display');
        if (fullDateEl) fullDateEl.innerText = now.toLocaleDateString('en-US', dateOptions);
    }, 1000);
}

function selectDate(day) {
    currentSelectedDay = day;
    const selectedDateEl = document.getElementById('selected-date');
    if (selectedDateEl) selectedDateEl.innerText = day;
    
    const dateObj = new Date(currentYear, currentMonth, day);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNameEl = document.getElementById('selected-day-name');
    if (dayNameEl) dayNameEl.innerText = dayName;

    const holidayLabel = document.getElementById('holiday-label');
    if (holidayLabel) {
        if (isHolidayForDate(day, currentMonth, currentYear)) {
            holidayLabel.innerText = "HOLIDAY";
            holidayLabel.style.display = "block";
            holidayLabel.style.color = "#a47109"
        }
        else{
            holidayLabel.innerText = "WORKING DAY";
            holidayLabel.style.display = "block";
            holidayLabel.style.color = "#1b7450"
        }
    }
    

    const holidayBtn = document.querySelector('.btn-holiday');
    const selectedDateObj = getSelectedDateObject();
    const canToggleHoliday = isInBookingWindow(selectedDateObj);
    // Update the button text according to the current day type.
    if (holidayBtn) {
        holidayBtn.classList.remove('is-selected', 'is-disabled');

        if (!canToggleHoliday) {
            holidayBtn.innerText = "Set Holiday (next 7 days only)";
            holidayBtn.disabled = true;
            holidayBtn.classList.add('is-disabled');
        } else {
            const isHoliday = isHolidayForDate(day, currentMonth, currentYear);
            holidayBtn.disabled = false;
            holidayBtn.innerText = isHoliday ? "Remove Holiday" : "Set Holiday";
            if (isHoliday) {
                holidayBtn.classList.add('is-selected');
            }
        }
    }
    


    CalenderBuild(); 
}


// helper function to make notification styled alerts
function showToast(message, type = 'working day') {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    
    
    //change notification color 
    if (type === 'holiday') {
        toast.style.backgroundColor = "#a47109"; 
        toast.style.border = "1px solid #ffffff";
    } else {
        toast.style.backgroundColor = "#1b7450"; 
        toast.style.border = "1px solid #ffffff";
    }

    toast.classList.add("show");
    // Auto-hide after 5.1 seconds
    setTimeout(() => { 
        toast.className = toast.className.replace("show", ""); 
    }, 5100);
}


// set the current day as holiday
function setAsHoliday() {
    const selectedDateObj = getSelectedDateObject();
    if (!isInBookingWindow(selectedDateObj)) {
        showToast('You can set holidays only within next 7 days from tomorrow.', 'holiday');
        return;
    }

    const dateKey = formatDateKey(selectedDateObj);
    const index = holidays.indexOf(dateKey);
    

    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    
    const dateString = `${currentSelectedDay}, ${monthNames[currentMonth]} ${currentYear}`;

    if (index === -1) {
        // normal day ---> holiday
        holidays.push(dateKey);
    } else {
        // holiday ---> normal day
        holidays.splice(index, 1);
    }

    selectDate(currentSelectedDay);

    syncWorkingDaysToServer()
        .then(function () {
            if (index === -1) {
                showToast(`${dateString} marked as Holiday!`, 'holiday');
                pushNotification('Holiday Set', `${dateString} is now a holiday.`, 'sys');
            } else {
                showToast(`${dateString} is now a normal working day.`, 'working day');
                pushNotification('Working Day Restored', `${dateString} is back to normal.`, 'sys');
            }
        })
        .catch(function (error) {
            // Revert local toggle when DB update fails.
            if (index === -1) {
                const rollbackIndex = holidays.indexOf(dateKey);
                if (rollbackIndex !== -1) {
                    holidays.splice(rollbackIndex, 1);
                }
            } else {
                holidays.push(dateKey);
            }

            selectDate(currentSelectedDay);
            showToast('Could not update holiday in database. Please try again.', 'holiday');
            console.warn('Holiday sync failed:', error && error.message ? error.message : error);
        });
}




// Appointment saving 
function saveAppointment() {
    const customer = document.getElementById('custName').value;
    const time = document.getElementById('startTime').value;

    if (!customer || !time) return alert("Fill all fields to save the event!.");

    if (holidays.includes(currentSelectedDay)) return alert("Cannot book on a Holiday.");

    // Build ISO startTime using selected date and time
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(currentSelectedDay).padStart(2, '0');
    const hhmm = time;
    const iso = `${currentYear}-${mm}-${dd}T${hhmm}:00`;

    const baseApi = (typeof API_BASE_URL === 'string' && API_BASE_URL) ? API_BASE_URL : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8080/api' : 'https://snip-me.onrender.com/api');

    const payload = {
        salonID: ownerSalonId,
        customerName: customer,
        startTime: iso
    };

    fetch(baseApi + '/bookings/owner/add', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    })
    .then(function (res) {
        if (!res.ok) return res.json().then(j=>{throw new Error(j && j.error ? j.error : 'Failed to create appointment')});
        return res.json();
    })
    .then(function (data) {
        alert('✅ Appointment created');
        toggleModal('event-modal', false);
        // reload schedule
        loadTodaySchedule();
    })
    .catch(function (err) {
        console.error('Failed to create appointment:', err);
        alert('Could not create appointment: ' + (err.message || err));
    });
}

function to12HourLabel(hour, minute) {
    const h = Number(hour);
    const m = Number(minute);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 'N/A';
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = (h % 12) || 12;
    return String(hour12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' ' + suffix;
}

function parseTimeParts(timeString, fallbackHour, fallbackMinute) {
    const safeHour = Number.isFinite(fallbackHour) ? fallbackHour : 7;
    const safeMinute = Number.isFinite(fallbackMinute) ? fallbackMinute : 0;
    if (!timeString || typeof timeString !== 'string') {
        return { hour: safeHour, minute: safeMinute };
    }

    const parts = timeString.trim().split(':');
    if (parts.length < 2) {
        return { hour: safeHour, minute: safeMinute };
    }

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return { hour: safeHour, minute: safeMinute };
    }

    return { hour: hour, minute: minute };
}

function getWorkingHourKeys() {
    const startInput = document.getElementById('salonStartTime');
    const endInput = document.getElementById('salonEndTime');
    const startParts = parseTimeParts(startInput ? startInput.value : '', 7, 0);
    const endParts = parseTimeParts(endInput ? endInput.value : '', 20, 0);

    const startMinutes = (startParts.hour * 60) + startParts.minute;
    const endMinutes = (endParts.hour * 60) + endParts.minute;
    if (endMinutes <= startMinutes) {
        return [];
    }

    const keys = [];
    for (let m = startMinutes; m < endMinutes; m += 60) {
        const hour = Math.floor(m / 60);
        const minute = m % 60;
        keys.push({
            key: String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'),
            label: to12HourLabel(hour, minute)
        });
    }
    return keys;
}

function getSlotTimeKey(startTimeValue) {
    if (!startTimeValue) return null;
    const dt = new Date(startTimeValue);
    if (Number.isNaN(dt.getTime())) return null;
    return String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
}

function isTodayDate(dateValue) {
    const dt = new Date(dateValue);
    if (Number.isNaN(dt.getTime())) return false;
    const now = new Date();
    return dt.getFullYear() === now.getFullYear()
        && dt.getMonth() === now.getMonth()
        && dt.getDate() === now.getDate();
}

function pickFirstNonEmpty(obj, fields) {
    for (let i = 0; i < fields.length; i += 1) {
        const value = obj ? obj[fields[i]] : null;
        if (value !== null && value !== undefined && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return 'NBY';
}

function showScheduleActionPopup(rowData) {
    const title = 'Time: ' + rowData.time + '\nCustomer: ' + rowData.customer + '\nService: ' + rowData.service + '\n\nPress OK to confirm user arrival.\nPress Cancel for cancel booking.';
    const confirmArrival = window.confirm(title);
    if (confirmArrival) {
        alert('confirm user arrival');
        return;
    }

    const cancelBooking = window.confirm('cancel booking');
    if (cancelBooking) {
        alert('cancel booking');
    }
}

function loadTodaySchedule() {
    const scheduleBody = document.getElementById('schedule-list');
    if (!scheduleBody) return Promise.resolve();

    const salonId = ownerSalonId || localStorage.getItem(OWNER_SALON_ID_KEY);
    const workingHours = getWorkingHourKeys();

    if (!salonId) {
        scheduleBody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.8;">Salon not linked to owner account.</td></tr>';
        return Promise.resolve();
    }

    if (!workingHours.length) {
        scheduleBody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.8;">Set opening/closing times in profile first.</td></tr>';
        return Promise.resolve();
    }

    scheduleBody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.8;">Loading schedule...</td></tr>';

    const bookingsUrl = ((typeof API_BASE_URL === 'string' && API_BASE_URL)
        ? API_BASE_URL
        : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:8080/api'
            : 'https://snip-me.onrender.com/api')) + '/bookings/all';

    const controller = new AbortController();
    const timeoutId = setTimeout(function () {
        controller.abort();
    }, 12000);

    return fetch(bookingsUrl, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
    })
    .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Failed to load schedule (' + res.status + ')');
        return res.json();
    })
    .then(function (rows) {
        const list = Array.isArray(rows) ? rows : [];
        const slotMap = {};

        list.forEach(function (slot) {
            const slotSalonId = slot && slot.salon && (slot.salon.salonID || slot.salon.salonId || slot.salon.id);
            if (String(slotSalonId) !== String(salonId)) return;
            if (!isTodayDate(slot.startTime)) return;

            const key = getSlotTimeKey(slot.startTime);
            if (!key) return;
            slotMap[key] = slot;
        });

        const fragment = document.createDocumentFragment();
        workingHours.forEach(function (w, index) {
            const slot = slotMap[w.key] || null;
            const hasBooking = slot && String(slot.status || '').toUpperCase() === 'BOOKED';

            // Prefer server-provided fields (customerName/serviceName), then linked objects
            const customer = hasBooking
                ? (slot.customerName || (slot.customer ? (slot.customer.name || slot.customer.email) : null) || 'NBY')
                : 'NBY';

            const service = hasBooking
                ? (slot.serviceName || (slot.service ? slot.service.name : null) || 'NBY')
                : 'NBY';

            const tr = document.createElement('tr');
            if (index === 0) {
                tr.id = 'starting-row';
            }

            const actionText = hasBooking ? 'Manage' : 'NBY';
            // Time badge: prefer server startTimeLabel if present
            const timeLabel = slot && slot.startTimeLabel ? slot.startTimeLabel : w.label;
            tr.innerHTML =
                '<td><div class="slot-cell">' + w.label + '<span class="time-badge">' + timeLabel + '</span></div></td>' +
                '<td>' + customer + '</td>' +
                '<td>' + service + '</td>' +
                '<td><button class="btn-small schedule-action-btn" type="button">' + actionText + '</button></td>';

            const actionBtn = tr.querySelector('.schedule-action-btn');
            if (actionBtn) {
                actionBtn.addEventListener('click', function () {
                    showScheduleActionPopup({
                        time: w.label,
                        customer: customer,
                        service: service
                    });
                });
            }

            fragment.appendChild(tr);
        });

        scheduleBody.innerHTML = '';
        scheduleBody.appendChild(fragment);
    })
    .catch(function (error) {
        clearTimeout(timeoutId);
        console.error('Failed to load today schedule:', error);
        scheduleBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#d66;">Could not load schedule.</td></tr>';
    });
}



// scrolling bar maintain.
function scrollStart() {
    // display from 7 AM 
    const targetRow = document.getElementById('starting-row');
    const scrollContainer = document.querySelector('.modal-scroll-area');

    if (targetRow && scrollContainer){
        setTimeout(() => {
            targetRow.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 50); 
    }
}



function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (!modal) return;

    if (show) {
        modal.style.display = 'flex';

        // Load live today schedule every time the modal opens.
        if (id === 'daily-modal') {
            loadTodaySchedule().finally(function () {
                scrollStart();
            });
        }
    } else {
        modal.style.display = 'none';
    }
}


function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth < 0) { 
        currentMonth = 11; 
        currentYear--; 
    } else if (currentMonth > 11) { 
        currentMonth = 0; 
        currentYear++; 
    }
    if (currentMonth === realMonth && currentYear === realYear) {
        selectDate(realToday);
    } else {
        currentSelectedDay = null;
        const selectedDateEl = document.getElementById('selected-date');
        if (selectedDateEl) selectedDateEl.innerText = '--';

        const dayNameEl = document.getElementById('selected-day-name');
        if (dayNameEl) dayNameEl.innerText = 'Select a date';

        const holidayLabel = document.getElementById('holiday-label');
        if (holidayLabel) holidayLabel.style.display = 'none';

        const holidayBtn = document.querySelector('.btn-holiday');
        if (holidayBtn) {
            holidayBtn.innerText = 'Set Holiday';
            holidayBtn.disabled = true;
            holidayBtn.classList.remove('is-selected');
            holidayBtn.classList.add('is-disabled');
        }

        CalenderBuild();
    }
}

function returnToToday() {
    currentMonth = realMonth;
    currentYear = realYear;
    selectDate(realToday);
}

function normalizeDisplayName(value) {
    if (!value) {
        return "";
    }

    return String(value).trim();
}

function applyOwnerBranding() {
    const brandEl = document.getElementById('ownerBrandName');
    const salonNameInput = document.getElementById('salonName');
    const storedSalonName = normalizeDisplayName(localStorage.getItem(OWNER_SALON_NAME_KEY));
    const storedOwnerName = normalizeDisplayName(localStorage.getItem(OWNER_NAME_KEY));
    const brandName = storedSalonName || storedOwnerName || 'Snip Me';

    if (brandEl) {
        brandEl.textContent = brandName;
    }

    document.title = brandName + ' - Owner Dashboard';

    if (salonNameInput && !salonNameInput.value && storedSalonName) {
        salonNameInput.value = storedSalonName;
    }
}

function refreshOwnerBrandingFromServer() {
    const ownerEmail = localStorage.getItem(OWNER_EMAIL_KEY);
    if (!ownerEmail || typeof API_BASE_URL === 'undefined') {
        return;
    }

    const endpoint = API_BASE_URL + '/auth/owner-salon?email=' + encodeURIComponent(ownerEmail);
    fetch(endpoint)
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Owner salon lookup failed with status ' + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            if (!data) {
                return;
            }

            const salonName = typeof data.salonName === 'string' ? data.salonName.trim() : '';
            const ownerName = typeof data.ownerName === 'string' ? data.ownerName.trim() : '';

            if (salonName) {
                localStorage.setItem(OWNER_SALON_NAME_KEY, salonName);
            }
            if (ownerName) {
                localStorage.setItem(OWNER_NAME_KEY, ownerName);
            }

            applyOwnerBranding();
        })
        .catch(function (error) {
            console.warn('Failed to refresh owner branding from server:', error.message || error);
        });
}

function setProfilePreview(photoDataUrl) {
    const preview = document.getElementById('profilePreview');
    if (!preview) {
        return;
    }

    const hasPhoto = typeof photoDataUrl === 'string' && photoDataUrl.trim().length > 0;
    if (hasPhoto) {
        preview.style.backgroundImage = "url('" + photoDataUrl + "')";
        preview.classList.add('has-image');
        return;
    }

    preview.style.backgroundImage = '';
    preview.classList.remove('has-image');
}

function parseLatLngFromText(text) {
    if (!text || typeof text !== 'string') {
        return null;
    }

    const match = text.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) {
        return null;
    }

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return { lat: lat, lng: lng };
}

function isInsideSriLanka(lat, lng) {
    if (!sriLankaBounds || typeof L === 'undefined') {
        return true;
    }
    return sriLankaBounds.contains(L.latLng(lat, lng));
}

function normalizeToSriLanka(lat, lng) {
    if (isInsideSriLanka(lat, lng)) {
        return { lat: lat, lng: lng };
    }
    return { lat: sriLankaCenter.lat, lng: sriLankaCenter.lng };
}

function setOwnerSelectedLocation(lat, lng, shouldCenterMap) {
    if (typeof L === 'undefined' || !ownerLocationMapInstance) {
        return;
    }

    const safePoint = normalizeToSriLanka(lat, lng);
    ownerSelectedLatLng = { lat: safePoint.lat, lng: safePoint.lng };

    if (ownerLocationMarker) {
        ownerLocationMarker.setLatLng([ownerSelectedLatLng.lat, ownerSelectedLatLng.lng]);
    } else {
        ownerLocationMarker = L.marker([ownerSelectedLatLng.lat, ownerSelectedLatLng.lng], { draggable: true }).addTo(ownerLocationMapInstance);
        ownerLocationMarker.on('dragend', function () {
            const markerPos = ownerLocationMarker.getLatLng();
            setOwnerSelectedLocation(markerPos.lat, markerPos.lng, false);
        });
    }

    if (shouldCenterMap) {
        ownerLocationMapInstance.setView([ownerSelectedLatLng.lat, ownerSelectedLatLng.lng], 14);
    }
}

function ensureOwnerLocationMap() {
    if (typeof L === 'undefined') {
        return;
    }

    if (ownerLocationMapInstance) {
        return;
    }

    ownerLocationMapInstance = L.map('ownerLocationMap', {
        zoomControl: true,
        maxBounds: sriLankaBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 8
    });

    ownerLocationMapInstance.fitBounds(sriLankaBounds);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles © Esri'
    }).addTo(ownerLocationMapInstance);

    ownerLocationMapInstance.on('click', function (e) {
        setOwnerSelectedLocation(e.latlng.lat, e.latlng.lng, false);
    });
}

function setupOwnerLocationPicker() {
    const locationInput = document.getElementById('salonLocation');
    const ownerLocBtn = document.getElementById('ownerLocBtn');
    const ownerLocationModal = document.getElementById('ownerLocationModal');
    const closeOwnerLocationModal = document.getElementById('closeOwnerLocationModal');
    const cancelOwnerLocationModal = document.getElementById('cancelOwnerLocationModal');
    const confirmOwnerLocationBtn = document.getElementById('confirmOwnerLocationBtn');

    if (!locationInput || !ownerLocBtn || !ownerLocationModal) {
        return;
    }

    function closeOwnerModal() {
        ownerLocationModal.classList.remove('open');
        ownerLocationModal.setAttribute('aria-hidden', 'true');
    }

    function openOwnerModal() {
        if (typeof L === 'undefined') {
            showToast('Map is not available right now.', 'holiday');
            return;
        }

        ensureOwnerLocationMap();
        ownerLocationModal.classList.add('open');
        ownerLocationModal.setAttribute('aria-hidden', 'false');

        const parsed = parseLatLngFromText(locationInput.value);
        if (parsed) {
            setOwnerSelectedLocation(parsed.lat, parsed.lng, true);
        } else if (!ownerSelectedLatLng) {
            setOwnerSelectedLocation(sriLankaCenter.lat, sriLankaCenter.lng, true);
        }

        setTimeout(function () {
            if (ownerLocationMapInstance) {
                ownerLocationMapInstance.invalidateSize();
            }
        }, 120);
    }

    ownerLocBtn.addEventListener('click', openOwnerModal);

    if (confirmOwnerLocationBtn) {
        confirmOwnerLocationBtn.addEventListener('click', function () {
            if (ownerSelectedLatLng) {
                locationInput.value = ownerSelectedLatLng.lat.toFixed(5) + ', ' + ownerSelectedLatLng.lng.toFixed(5);
            }
            closeOwnerModal();
        });
    }

    if (closeOwnerLocationModal) {
        closeOwnerLocationModal.addEventListener('click', closeOwnerModal);
    }

    if (cancelOwnerLocationModal) {
        cancelOwnerLocationModal.addEventListener('click', closeOwnerModal);
    }

    ownerLocationModal.addEventListener('click', function (event) {
        if (event.target === ownerLocationModal) {
            closeOwnerModal();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && ownerLocationModal.classList.contains('open')) {
            closeOwnerModal();
        }
    });
}

function readImageAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(new Error('Could not read image file.')); };
        reader.readAsDataURL(file);
    });
}

function compressImageLowQuality(file) {
    return readImageAsDataUrl(file).then(function (dataUrl) {
        return new Promise(function (resolve, reject) {
            const img = new Image();
            img.onload = function () {
                const maxSize = 220;
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const width = Math.max(1, Math.round(img.width * scale));
                const height = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error('Could not initialize image canvas.'));
                    return;
                }

                context.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.18));
            };
            img.onerror = function () { reject(new Error('Invalid image file.')); };
            img.src = dataUrl;
        });
    });
}

function populateOwnerProfile(profile) {
    const salonNameInput = document.getElementById('salonName');
    const salonAddressInput = document.getElementById('salonAddress');
    const salonLocationInput = document.getElementById('salonLocation');
    const salonNearestCityInput = document.getElementById('salonNearestCity');
    const salonStartTimeInput = document.getElementById('salonStartTime');
    const salonEndTimeInput = document.getElementById('salonEndTime');
    const salonContactInput = document.getElementById('salonContact');

    const salonName = normalizeDisplayName(profile && profile.salonName);
    const address = normalizeDisplayName(profile && profile.address);
    const nearestCity = normalizeDisplayName(profile && (profile.nearestCity || profile.city));
    const latitude = normalizeDisplayName(profile && profile.latitude);
    const longitude = normalizeDisplayName(profile && profile.longitude);
    const location = latitude && longitude ? (latitude + ', ' + longitude) : normalizeDisplayName(profile && profile.location);
    const startTime = normalizeDisplayName(profile && profile.startTime);
    const endTime = normalizeDisplayName(profile && profile.endTime);
    const contact = normalizeDisplayName(profile && profile.contact);
    const photoLowQuality = normalizeDisplayName(profile && profile.photoLowQuality);
    const holidaysString = normalizeDisplayName(profile && profile.holidays);

    if (salonNameInput) salonNameInput.value = salonName;
    if (salonAddressInput) salonAddressInput.value = address;
    if (salonLocationInput) salonLocationInput.value = location;
    if (salonNearestCityInput) salonNearestCityInput.value = nearestCity;
    if (salonStartTimeInput) salonStartTimeInput.value = startTime;
    if (salonEndTimeInput) salonEndTimeInput.value = endTime;
    if (salonContactInput) salonContactInput.value = contact;

    const parsedCoords = parseLatLngFromText(location);
    if (parsedCoords) {
        ownerSelectedLatLng = { lat: parsedCoords.lat, lng: parsedCoords.lng };
    }

    ownerProfilePhotoLowQuality = photoLowQuality;
    setProfilePreview(ownerProfilePhotoLowQuality);

    ownerWorkingDaysCache = holidaysString;
    if (holidaysString) {
        holidays = holidaysString.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        removePastHolidays(); // Clean up any past holidays from loaded data
    }

    if (salonName) {
        localStorage.setItem(OWNER_SALON_NAME_KEY, salonName);
        applyOwnerBranding();
    }

    const sid = profile && (profile.salonId || profile.salonID || profile.id);
    if (sid) {
        ownerSalonId = sid;
        localStorage.setItem(OWNER_SALON_ID_KEY, String(sid));
    }
}

function loadOwnerProfile() {
    const ownerEmail = localStorage.getItem(OWNER_EMAIL_KEY);
    if (!ownerEmail || typeof AUTH_BASE_URL === 'undefined') {
        return;
    }

    const endpoint = AUTH_BASE_URL + '/owner-profile?email=' + encodeURIComponent(ownerEmail);
    fetch(endpoint)
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Owner profile lookup failed with status ' + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            populateOwnerProfile(data || {});
            reloadNotificationsFromServer();
        })
        .catch(function (error) {
            console.warn('Failed to load owner profile:', error.message || error);
        });
}

function saveOwnerProfile(event) {
    event.preventDefault();

    const ownerEmail = localStorage.getItem(OWNER_EMAIL_KEY);
    if (!ownerEmail || typeof AUTH_BASE_URL === 'undefined') {
        showToast('Unable to save. Owner session missing.', 'holiday');
        return;
    }

    const salonNameInput = document.getElementById('salonName');
    const salonAddressInput = document.getElementById('salonAddress');
    const salonLocationInput = document.getElementById('salonLocation');
    const salonNearestCityInput = document.getElementById('salonNearestCity');
    const salonStartTimeInput = document.getElementById('salonStartTime');
    const salonEndTimeInput = document.getElementById('salonEndTime');
    const salonContactInput = document.getElementById('salonContact');

    const salonName = salonNameInput ? salonNameInput.value.trim() : '';
    const address = salonAddressInput ? salonAddressInput.value.trim() : '';
    const location = salonLocationInput ? salonLocationInput.value.trim() : '';
    const nearestCity = salonNearestCityInput ? salonNearestCityInput.value.trim() : '';
    const startTime = salonStartTimeInput ? salonStartTimeInput.value.trim() : '';
    const endTime = salonEndTimeInput ? salonEndTimeInput.value.trim() : '';
    const contact = salonContactInput ? salonContactInput.value.trim() : '';
    const parsedCoords = parseLatLngFromText(location);
    const latitude = parsedCoords ? String(parsedCoords.lat) : '';
    const longitude = parsedCoords ? String(parsedCoords.lng) : '';

    if (!salonName) {
        showToast('Salon name is required.', 'holiday');
        return;
    }

    if (typeof showLoader === 'function') {
        showLoader();
    }

    fetch(AUTH_BASE_URL + '/owner-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: ownerEmail,
            salonName: salonName,
            address: address,
            location: location,
            nearestCity: nearestCity,
            startTime: startTime,
            endTime: endTime,
            latitude: latitude,
            longitude: longitude,
            workingDays: ownerWorkingDaysCache,
            contact: contact,
            photoLowQuality: ownerProfilePhotoLowQuality
        })
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Save failed with status ' + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            populateOwnerProfile(data || {});
            showToast('Details updated successfully!', 'working day');
            pushNotification('Profile Updated', 'Your salon details were successfully synced.', 'sys');
        })
        .catch(function (error) {
            console.error('Failed to save owner profile:', error);
            showToast('Failed to save details.', 'holiday');
        })
        .finally(function () {
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
        });
}

function setupOwnerProfilePanel() {
    const detailsForm = document.getElementById('salon-details-form');
    const imageUpload = document.getElementById('imageUpload');

    if (detailsForm) {
        detailsForm.addEventListener('submit', saveOwnerProfile);
    }

    if (imageUpload) {
        imageUpload.addEventListener('change', function () {
            const file = imageUpload.files && imageUpload.files[0];
            if (!file) {
                return;
            }

            compressImageLowQuality(file)
                .then(function (compressedDataUrl) {
                    ownerProfilePhotoLowQuality = compressedDataUrl;
                    setProfilePreview(ownerProfilePhotoLowQuality);
                    showToast('Photo ready. Save changes to apply.', 'working day');
                })
                .catch(function (error) {
                    console.error('Failed to process profile photo:', error);
                    showToast('Could not process image.', 'holiday');
                });
        });
    }
}

// Initializing on load
document.addEventListener('DOMContentLoaded', () => {
    ownerSalonId = localStorage.getItem(OWNER_SALON_ID_KEY) || null;
    setupOwnerLocationPicker();
    setupOwnerProfilePanel();
    setupServicesSection();
    setupNotificationBell();  
    applyOwnerBranding();
    loadOwnerProfile();
    refreshOwnerBrandingFromServer();
    CalenderBuild(); 
    selectDate(realToday); 
    startLiveClock();
    reloadNotificationsFromServer();
    setInterval(reloadNotificationsFromServer, 30000);
});

// Sidebar navigation logic
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
        const target = document.getElementById(link.getAttribute('data-target'));
        if (target) target.style.display = 'block';
    });
});


// service section 
function addServiceToTable(name, price) {
    const tableBody = document.getElementById('active-services-list');
    const today = new Date().toISOString().split('T')[0];

    const newRow = `
        <tr>
            <td>${name}</td>
            <td>${price}</td>
            <td>${today}</td>
            <td><span class="status-tag active">Live</span></td>
        </tr>
    `;
    
    tableBody.innerHTML += newRow;
    showToast(`${name} added!`, 'working day');
}

// Load services for the salon from the database
function loadOwnerServices() {
    const ownerEmail = localStorage.getItem(OWNER_EMAIL_KEY);
    if (!ownerEmail || typeof API_BASE_URL === 'undefined') {
        console.error('Missing owner email or API URL for services');
        // Still try to load available services even without email
        loadAvailableServices();
        return;
    }

    // First, get the salon ID from the owner's profile
    fetch(AUTH_BASE_URL + '/owner-profile?email=' + encodeURIComponent(ownerEmail))
        .then(response => {
            if (!response.ok) {
                console.warn('Could not load profile, fetching available services instead');
                return null;
            }
            return response.json();
        })
        .then(profile => {
            if (!profile || !profile.salonId) {
                console.warn('No salon ID found for owner, loading available services');
                loadAvailableServices();
                return;
            }

            // Now fetch services for this salon
            return fetchServicesForSalon(profile.salonId);
        })
        .catch(error => {
            console.error('Failed to load owner services:', error);
            loadAvailableServices();
        });
}

function loadAvailableServices() {
    const apiUrl = API_BASE_URL + '/salon-owner/services/available';
    
    fetch(apiUrl, {
        headers: getAuthHeaders()
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to load available services');
            return response.json();
        })
        .then(data => {
            if (!data.services || data.services.length === 0) {
                displayNoServices();
                return;
            }
            displayServices(data.services);
        })
        .catch(error => {
            console.error('Error fetching available services:', error);
            displayNoServices();
        });
}

function fetchServicesForSalon(salonId) {
    // Fetch services with pricing (these are services the salon owner has added)
    const apiUrl = API_BASE_URL + '/salon-owner/services/with-prices/' + salonId;
    
    return fetch(apiUrl, {
        headers: getAuthHeaders()
    })
        .then(response => {
            if (!response.ok) {
                console.warn('Could not fetch salon services with pricing');
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data) {
                displayNoServices();
                loadServiceRequests(salonId);
                return;
            }
            
            if (!data.services || data.services.length === 0) {
                displayNoServices();
                // Still try to load requests
                loadServiceRequests(salonId);
                return;
            }

            // Convert the pricing data format to match displayServices expectations
            const servicesForDisplay = data.services.map(service => ({
                id: service.serviceId,
                name: service.serviceName,
                price: service.price,
                pricingId: service.pricingId
            }));

            displayServices(servicesForDisplay);
            loadServiceRequests(salonId);
        })
        .catch(error => {
            console.error('Error fetching services:', error);
            displayNoServices();
            loadServiceRequests(salonId);
        });
}

function displayServices(services) {
    const tableBody = document.getElementById('active-services-list');
    const emptyState = document.getElementById('services-empty-state');
    
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (!services || services.length === 0) {
        displayNoServices();
        return;
    }

    emptyState.style.display = 'none';
    
    services.forEach(service => {
        const createdDate = service.createdAt ? new Date(service.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const priceDisplay = service.price ? `₨${parseFloat(service.price).toFixed(2)}` : 'N/A';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${service.name || 'Unknown'}</td>
            <td><span class="status-tag active">Available</span></td>
            <td>${priceDisplay}</td>
        `;
        tableBody.appendChild(row);
    });
}

function displayNoServices() {
    const emptyState = document.getElementById('services-empty-state');
    const tableBody = document.getElementById('active-services-list');
    
    if (tableBody) tableBody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
}

function loadServiceRequests(salonId) {
    const apiUrl = API_BASE_URL + '/salon-owner/services/requests/' + salonId;
    
    fetch(apiUrl, {
        headers: getAuthHeaders()
    })
        .then(response => response.ok ? response.json() : Promise.reject('Failed to load requests'))
        .then(data => {
            displayServiceRequests(data.requests || []);
        })
        .catch(error => {
            console.error('Error loading service requests:', error);
            const emptyMsg = document.getElementById('service-requests-empty');
            if (emptyMsg) emptyMsg.style.display = 'block';
        });
}

function displayServiceRequests(requests) {
    const tableBody = document.getElementById('service-requests-list');
    const emptyMsg = document.getElementById('service-requests-empty');
    
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (!requests || requests.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    
    requests.forEach(request => {
        const requestDate = request.requestedAt ? new Date(request.requestedAt).toISOString().split('T')[0] : 'N/A';
        const statusClass = request.status === 'APPROVED' ? 'active' : request.status === 'REJECTED' ? 'rejected' : 'pending';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.serviceName || 'Unnamed Request'}</td>
            <td><span class="status-tag ${statusClass}">${request.status}</span></td>
            <td>${requestDate}</td>
        `;
        tableBody.appendChild(row);
    });
}

function submitCustomService() {
    const serviceName = document.getElementById('service-name').value;
    const description = document.getElementById('service-description').value;
    const ownerEmail = localStorage.getItem(OWNER_EMAIL_KEY);

    if (!serviceName || !serviceName.trim()) {
        showToast('Please enter a service name', 'holiday');
        return;
    }

    if (!ownerEmail || typeof API_BASE_URL === 'undefined') {
        showToast('Unable to submit request. Owner session missing.', 'holiday');
        return;
    }

    // Show loading state
    const submitBtn = document.getElementById('submit-service-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Get salon ID first
    fetch(AUTH_BASE_URL + '/owner-profile?email=' + encodeURIComponent(ownerEmail))
        .then(response => {
            if (!response.ok) throw new Error('Cannot load profile');
            return response.json();
        })
        .then(profile => {
            if (!profile || !profile.salonId) {
                throw new Error('Unable to identify your salon');
            }

            // Submit the service request
            return fetch(API_BASE_URL + '/salon-owner/services/request-custom', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    salonId: profile.salonId,
                    serviceName: serviceName.trim(),
                    description: description.trim()
                })
            });
        })
        .then(response => {
            if (!response.ok) throw new Error('Request failed');
            return response.json();
        })
        .then(data => {
            showToast(data.message || 'Service request submitted successfully!', 'working day');
            document.getElementById('custom-service-form').reset();
            toggleModal('custom-service-modal', false);
            
            // Reload services to show the new request
            setTimeout(() => {
                loadOwnerServices();
            }, 500);
        })
        .catch(error => {
            console.error('Error submitting service request:', error);
            showToast('Failed to submit service request. Please try again.', 'holiday');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
}

// Setup event listeners for services section
function setupServicesSection() {
    const customServiceBtn = document.getElementById('custom-service-btn');
    if (customServiceBtn) {
        customServiceBtn.addEventListener('click', () => {
            toggleModal('custom-service-modal', true);
        });
    }

    // Load services on page load
    loadOwnerServices();
    
    // Load available services grid for pricing
    loadAvailableServicesForPricing();
}

// Service icon mapping based on service name
function getServiceIcon(serviceName) {
    const name = (serviceName || '').toLowerCase();
    
    const iconMap = {
        'haircut': 'fas fa-cut',
        'hair': 'fas fa-cut',
        'shampoo': 'fas fa-shower',
        'coloring': 'fas fa-palette',
        'color': 'fas fa-palette',
        'straightening': 'fas fa-wand-magic-sparkles',
        'perming': 'fas fa-wand-magic-sparkles',
        'treatment': 'fas fa-flask',
        'manicure': 'fas fa-hand-fist',
        'pedicure': 'fas fa-foot',
        'massage': 'fas fa-hand',
        'facial': 'fas fa-face-smile',
        'threading': 'fas fa-needle',
        'waxing': 'fas fa-leaf',
        'beard': 'fas fa-beard',
        'trimming': 'fas fa-cut',
        'styling': 'fas fa-wand-magic-sparkles',
        'extension': 'fas fa-arrows-alt-h',
        'blowdry': 'fas fa-fan',
        'dryer': 'fas fa-fan'
    };
    
    // Check for exact or partial matches
    for (const [key, icon] of Object.entries(iconMap)) {
        if (name.includes(key)) {
            return icon;
        }
    }
    
    // Default icon
    return 'fas fa-spa';
}

// Load available services for the pricing section
function loadAvailableServicesForPricing() {
    const ownerEmail = localStorage.getItem(OWNER_EMAIL_KEY);
    
    // First get salon ID
    if (!ownerEmail || typeof API_BASE_URL === 'undefined') {
        console.warn('loadAvailableServicesForPricing: Missing email or API URL');
        displayNoAvailableServices();
        return;
    }

    console.log('loadAvailableServicesForPricing: Starting service load for email:', ownerEmail);

    fetch(AUTH_BASE_URL + '/owner-profile?email=' + encodeURIComponent(ownerEmail))
        .then(response => {
            console.log('Owner profile response status:', response.status);
            if (!response.ok) return null;
            return response.json();
        })
        .then(profile => {
            if (!profile || !profile.salonId) {
                console.warn('loadAvailableServicesForPricing: No salon ID in profile');
                displayNoAvailableServices();
                return;
            }

            console.log('loadAvailableServicesForPricing: Got salon ID:', profile.salonId);

            // Load all available services
            return fetch(API_BASE_URL + '/salon-owner/services/available', {
                headers: getAuthHeaders()
            })
                .then(response => {
                    console.log('Available services response status:', response.status);
                    if (!response.ok) {
                        console.error('Failed to fetch services, status:', response.status);
                        throw new Error('Failed to load services');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Available services data:', data);
                    if (!data || !data.services || data.services.length === 0) {
                        console.warn('loadAvailableServicesForPricing: No services in response');
                        displayNoAvailableServices();
                        return;
                    }

                    console.log('loadAvailableServicesForPricing: Found', data.services.length, 'services');

                    // Get services already added for this salon
                    return fetch(API_BASE_URL + '/salon-owner/services/with-prices/' + profile.salonId, {
                        headers: getAuthHeaders()
                    })
                        .then(response => {
                            console.log('With-prices response status:', response.status);
                            if (!response.ok) {
                                console.warn('Could not fetch priced services, showing all');
                                return { services: [] };
                            }
                            return response.json();
                        })
                        .then(pricedData => {
                            const addedServiceIds = new Set();
                            if (pricedData.services && pricedData.services.length > 0) {
                                pricedData.services.forEach(s => addedServiceIds.add(s.serviceId));
                                console.log('Already added service IDs:', Array.from(addedServiceIds));
                            }

                            // Filter out already added services
                            const unavailableServices = data.services.filter(s => !addedServiceIds.has(s.id));
                            console.log('Unavailable services (to add):', unavailableServices.length);
                            console.log('Unavailable services list:', unavailableServices);
                            
                            if (unavailableServices.length === 0 && data.services.length > 0) {
                                console.log('All services already added for this salon');
                            }
                            
                            displayAvailableServicesForPricing(unavailableServices, profile.salonId);
                        });
                });
        })
        .catch(error => {
            console.error('Error loading available services for pricing:', error);
            console.error('Error details:', error.message, error.stack);
            displayNoAvailableServices();
        });
}

function displayAvailableServicesForPricing(services, salonId) {
    const grid = document.getElementById('available-services-grid');
    const emptyState = document.getElementById('available-services-empty');
    
    console.log('displayAvailableServicesForPricing called with:', { servicesCount: services ? services.length : 0, salonId });
    
    if (!grid) {
        console.error('ERROR: Grid element not found (available-services-grid)');
        return;
    }

    if (!services || services.length === 0) {
        console.log('[EMPTY STATE] No available services to display - showing empty message');
        displayNoAvailableServices();
        return;
    }

    console.log('[DISPLAY] Rendering', services.length, 'available services for pricing');
    console.log('[SERVICE DETAILS]', services.map(s => ({ id: s.id, name: s.name, desc: s.description })));
    
    grid.innerHTML = '';
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    services.forEach((service, idx) => {
        try {
            const icon = getServiceIcon(service.name);
            const card = document.createElement('div');
            card.className = 'service-add-card';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="plus-icon"><i class="fas fa-plus"></i></div>
                <div class="service-icon"><i class="${icon}"></i></div>
                <h4>${service.name}</h4>
                <p>Tap to add pricing</p>
            `;
            
            card.addEventListener('click', () => {
                console.log('[CLICK] Service card clicked:', { id: service.id, name: service.name });
                openServicePricingModal(service.id, service.name, icon, salonId);
            });
            
            grid.appendChild(card);
            console.log(`[CARD ${idx + 1}] Created card for: ${service.name}`);
        } catch (err) {
            console.error(`[ERROR] Failed to create card for service ${idx}:`, err);
        }
    });
    
    console.log('[COMPLETE] Finished rendering all service cards. Total count:', grid.children.length);
}

function displayNoAvailableServices() {
    const grid = document.getElementById('available-services-grid');
    const emptyState = document.getElementById('available-services-empty');
    
    if (grid) grid.innerHTML = '';
    if (emptyState) {
        emptyState.style.display = 'block';
        console.log('Showing empty state for available services');
    }
}

// Modal functions for service pricing
let selectedServiceData = { id: null, name: null, icon: null, salonId: null };

function openServicePricingModal(serviceId, serviceName, serviceIcon, salonId) {
    selectedServiceData = { id: serviceId, name: serviceName, icon: serviceIcon, salonId: salonId };
    
    const nameEl = document.getElementById('selected-service-name');
    const iconEl = document.getElementById('selected-service-icon');
    const priceInput = document.getElementById('service-price-input');
    
    if (nameEl) nameEl.textContent = serviceName;
    if (iconEl) iconEl.innerHTML = `<i class="${serviceIcon}"></i>`;
    if (priceInput) priceInput.value = '';
    
    toggleModal('service-pricing-modal', true);
    if (priceInput) priceInput.focus();
}

function closeServicePricingModal() {
    toggleModal('service-pricing-modal', false);
    selectedServiceData = { id: null, name: null, icon: null, salonId: null };
}

function submitServicePricing() {
    const priceInput = document.getElementById('service-price-input');
    const price = parseFloat(priceInput.value);
    
    if (!selectedServiceData.id) {
        showToast('No service selected', 'holiday');
        return;
    }
    
    if (isNaN(price) || price < 0) {
        showToast('Please enter a valid price', 'holiday');
        return;
    }

    const submitBtn = event.target;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    const payload = {
        salonId: selectedServiceData.salonId,
        serviceId: selectedServiceData.id,
        price: price
    };

    fetch(API_BASE_URL + '/salon-owner/services/add-available-service', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to add service');
            return response.json();
        })
        .then(data => {
            showToast(`${selectedServiceData.name} added at ${price}!`, 'working day');
            closeServicePricingModal();
            
            // Reload available services grid
            loadAvailableServicesForPricing();
            
            // Reload services table after a delay
            setTimeout(() => {
                loadOwnerServices();
            }, 500);
        })
        .catch(error => {
            console.error('Error adding service:', error);
            showToast('Failed to add service. Please try again.', 'holiday');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
}




