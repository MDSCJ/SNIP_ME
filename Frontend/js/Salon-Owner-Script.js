let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();


const realToday = new Date().getDate();
const realMonth = new Date().getMonth();
const realYear = new Date().getFullYear();

// tracking user clicked days 
let currentSelectedDay = realToday;
let holidays = [];
let appointments = [];

// Calendar part
function CalenderBuild() {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
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
        slot.style.border = ""; 
        slot.onclick = null; 

        if (i < firstDayIndex || i >= (firstDayIndex + daysInMonth)) {
            slot.innerHTML = '<i class="fas fa-scissors"></i>';
            slot.classList.add('slot-empty');
        } else {
            const dateNum = i - firstDayIndex + 1;
            slot.innerText = dateNum;

            if (holidays.includes(dateNum)) {
                slot.classList.add('is-holiday');
            } else {
                slot.classList.add('slot-free'); 
            }

            if (dateNum === currentSelectedDay) {
                slot.style.border = "3px solid #2c3e50";
            } 
            else if (dateNum === realToday && currentMonth === realMonth && currentYear === realYear) {
                slot.style.border = "2px solid #4ecca3"; 
            }

            slot.onclick = () => selectDate(dateNum);
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
        holidayLabel.style.display = holidays.includes(day) ? 'block' : 'none';
    }

    CalenderBuild(); 
}

function setAsHoliday() {
    if (!holidays.includes(currentSelectedDay)) {
        holidays.push(currentSelectedDay);
        alert(`Day ${currentSelectedDay} marked as Holiday!`);
        selectDate(currentSelectedDay);
    } else {
        alert("Already a holiday.");
    }
}

function saveEvent() {
    const customer = document.getElementById('custName').value;
    const time = document.getElementById('startTime').value;

    if (!customer || !time) return alert("Fill all fields to save the event!.");

    const isTaken = appointments.some(app => app.date === currentSelectedDay && app.month === currentMonth && app.time === time);
    
    if (holidays.includes(currentSelectedDay)) return alert("Cannot book on a Holiday.");
    if (isTaken) return alert("This slot is already booked!");

    appointments.push({ date: currentSelectedDay, month: currentMonth, customer, time });
    alert(`✅ Success: ${customer} at ${time}`);
    toggleModal('event-modal', false);
}

function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = show ? 'flex' : 'none'; 
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
    currentSelectedDay = (currentMonth === realMonth && currentYear === realYear) ? realToday : 1;
    CalenderBuild();
}

function returnToToday() {
    currentMonth = realMonth;
    currentYear = realYear;
    selectDate(realToday);
}

// Initializing on load
document.addEventListener('DOMContentLoaded', () => {
    CalenderBuild(); 
    selectDate(realToday); 
    startLiveClock();
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