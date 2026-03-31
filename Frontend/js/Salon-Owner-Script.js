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
                slot.style.border = "1.5px solid #4e3505";
            } 
            else if (dateNum === realToday && currentMonth === realMonth && currentYear === realYear) {
                slot.style.border = "2px dashed #f0c312"; 
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
        if(holidays.includes(day)) {
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
    // Update the button text according to the current day type.
    if (holidayBtn) {
        holidayBtn.innerText = holidays.includes(currentSelectedDay) ? "Remove Holiday" : "Set Holiday";
        holidayBtn.style.backgroundColor = holidays.includes(day) ? "#1b7450" : "#a47109";
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
    const index = holidays.indexOf(currentSelectedDay);
    

    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    
    const dateString = `${currentSelectedDay}, ${monthNames[currentMonth]} ${currentYear}`;

    if (index === -1) {
        // normal day ---> holiday
        holidays.push(currentSelectedDay);
        showToast(`${dateString} marked as Holiday!`, 'holiday');
    } else {
        // holiday ---> normal day
        holidays.splice(index, 1);
        showToast(`${dateString} is now a normal working day.`, 'working day');
    }

    // Refresh the calendar colors
    selectDate(currentSelectedDay);
}




// Appointment saving 
function saveAppointment() {
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
    //TO DO : modify this function 001.....
    if (show) {
        modal.style.display = 'flex';
        //trigging scroll if opening the view schedule
        if (id === 'daily-modal') {
            scrollStart();
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


