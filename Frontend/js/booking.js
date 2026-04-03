// Global state for booking
let bookingState = {
    salonId: null,
    salonName: null,
    salonDescription: null,
    services: [],
    selectedService: null,
    selectedDate: null,
    selectedSlot: null,
    customerID: null,
    bookingID: null,
    paymentMethod: 'online'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking page loaded');
    
    // Get customer ID from session or localStorage
    bookingState.customerID = localStorage.getItem('customerID') || sessionStorage.getItem('customerID');
    
    // Get salon info from URL parameters or session
    const params = new URLSearchParams(window.location.search);
    bookingState.salonId = params.get('salonId') || sessionStorage.getItem('selectedSalonId');
    bookingState.salonName = params.get('salonName') || sessionStorage.getItem('selectedSalonName') || 'Salon';
    bookingState.salonDescription = params.get('salonDesc') || sessionStorage.getItem('selectedSalonDesc') || 'Professional salon services';
    bookingState.services = JSON.parse(params.get('services') || sessionStorage.getItem('selectedServices') || '[]');
    
    // Populate salon details
    document.getElementById('salonName').textContent = bookingState.salonName;
    document.getElementById('salonDescription').textContent = bookingState.salonDescription;
    document.getElementById('salonNameStep2').textContent = `at ${bookingState.salonName}`;
    
    // Populate service dropdown
    const serviceSelect = document.getElementById('serviceSelect');
    if (bookingState.services.length > 0) {
        bookingState.services.forEach(service => {
            const option = document.createElement('option');
            option.value = service;
            option.textContent = service;
            serviceSelect.appendChild(option);
        });
    } else {
        serviceSelect.innerHTML += '<option value="haircut">Haircut</option><option value="beard">Beard Trim</option><option value="styling">Styling</option>';
    }
    
    // Event listeners
    serviceSelect.addEventListener('change', updateServiceDisplay);
    document.getElementById('dateInput').addEventListener('change', validateDate);
    
    // Payment method toggle
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            bookingState.paymentMethod = this.value;
            toggleCardForm();
        });
    });
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').min = today;
    
    toggleCardForm();
});

function updateServiceDisplay() {
    const service = document.getElementById('serviceSelect').value;
    bookingState.selectedService = service || null;
    const display = document.getElementById('selectedServiceDisplay');
    display.textContent = service ? `Selected: ${service}` : 'None selected';
}

function validateDate() {
    const dateInput = document.getElementById('dateInput');
    const errorMsg = document.getElementById('dateError');
    
    if (!dateInput.value) {
        errorMsg.textContent = 'Please select a date';
        return false;
    }
    
    const selectedDate = new Date(dateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        errorMsg.textContent = 'Cannot book in the past';
        return false;
    }
    
    errorMsg.textContent = '';
    bookingState.selectedDate = dateInput.value;
    return true;
}

function proceedToSlots() {
    // Validate inputs
    if (!document.getElementById('serviceSelect').value) {
        alert('Please select a service');
        return;
    }
    
    if (!validateDate()) {
        return;
    }
    
    // Move to step 2
    goToStep(2);
    loadAvailableSlots();
}

function loadAvailableSlots() {
    const slotsGrid = document.getElementById('timeSlotsGrid');
    slotsGrid.innerHTML = '<p class="loading">Loading available slots...</p>';
    
    fetch(`${API_BASE_URL}/bookings/available`)
        .then(response => response.json())
        .then(slots => {
            displaySlots(slots);
        })
        .catch(error => {
            console.error('Error loading slots:', error);
            slotsGrid.innerHTML = '<p class="error-text">Failed to load available slots. Please try again.</p>';
        });
}

function displaySlots(slots) {
    const slotsGrid = document.getElementById('timeSlotsGrid');
    slotsGrid.innerHTML = '';
    
    if (!slots || slots.length === 0) {
        slotsGrid.innerHTML = '<p class="no-slots">No available slots for this date. Please select another date.</p>';
        return;
    }
    
    // Filter slots for the selected date
    const selectedDate = bookingState.selectedDate;
    const filteredSlots = slots.filter(slot => {
        const slotDate = new Date(slot.startTime).toISOString().split('T')[0];
        return slotDate === selectedDate && slot.status === 'AVAILABLE';
    });
    
    if (filteredSlots.length === 0) {
        slotsGrid.innerHTML = '<p class="no-slots">No available slots for the selected date. Please try another date.</p>';
        return;
    }
    
    filteredSlots.forEach(slot => {
        const slotElement = createSlotElement(slot);
        slotsGrid.appendChild(slotElement);
    });
    
    // Enable next button once slots are loaded
    document.getElementById('nextBtn2').disabled = false;
}

function createSlotElement(slot) {
    const slotDiv = document.createElement('div');
    slotDiv.className = 'time-slot';
    
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);
    const timeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
    
    slotDiv.innerHTML = `
        <input type="radio" name="timeSlot" value="${slot.slotID}" id="slot${slot.slotID}">
        <label for="slot${slot.slotID}">
            <span class="slot-time">${timeStr}</span>
            <span class="slot-duration">30 min</span>
        </label>
    `;
    
    slotDiv.addEventListener('click', function() {
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        slotDiv.classList.add('selected');
        bookingState.selectedSlot = slot.slotID;
        document.getElementById('nextBtn2').disabled = false;
    });
    
    return slotDiv;
}

function proceedToPayment() {
    if (!bookingState.selectedSlot) {
        alert('Please select a time slot');
        return;
    }
    
    // Move to step 3
    goToStep(3);
    updateBookingSummary();
}

function updateBookingSummary() {
    const summaryDiv = document.getElementById('bookingSummary');
    const serviceText = bookingState.selectedService || 'Service';
    const dateText = new Date(bookingState.selectedDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    summaryDiv.innerHTML = `
        <strong>Salon:</strong> ${bookingState.salonName}<br>
        <strong>Service:</strong> ${serviceText}<br>
        <strong>Date:</strong> ${dateText}<br>
        <strong>Amount:</strong> $25.00
    `;
}

function toggleCardForm() {
    const cardForm = document.getElementById('cardForm');
    if (bookingState.paymentMethod === 'online') {
        cardForm.style.display = 'block';
        document.querySelectorAll('#cardForm input').forEach(input => input.required = true);
    } else {
        cardForm.style.display = 'none';
        document.querySelectorAll('#cardForm input').forEach(input => input.required = false);
    }
}

function validateCardForm() {
    if (bookingState.paymentMethod === 'cash') {
        return true;
    }
    
    const name = document.getElementById('cardName').value;
    const cardNumber = document.getElementById('cardNumber').value;
    const expiry = document.getElementById('cardExpiry').value;
    const cvv = document.getElementById('cardCVV').value;
    const errorDiv = document.getElementById('paymentError');
    
    if (!name || !cardNumber || !expiry || !cvv) {
        errorDiv.textContent = 'Please fill in all card details';
        return false;
    }
    
    if (cardNumber.replace(/\s/g, '').length !== 16) {
        errorDiv.textContent = 'Invalid card number (should be 16 digits)';
        return false;
    }
    
    if (!expiry.match(/^\d{2}\/\d{2}$/)) {
        errorDiv.textContent = 'Invalid expiry date format (use MM/YY)';
        return false;
    }
    
    if (cvv.length !== 3) {
        errorDiv.textContent = 'Invalid CVV (should be 3 digits)';
        return false;
    }
    
    errorDiv.textContent = '';
    return true;
}

function confirmBooking() {
    if (!validateCardForm()) {
        return;
    }
    
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';
    
    // Step 1: Initiate booking (lock the slot)
    fetch(`${API_BASE_URL}/bookings/initiate?slotID=${bookingState.selectedSlot}&customerID=${bookingState.customerID}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        console.log('Booking initiated:', data);
        
        // Step 2: Confirm booking (after payment)
        return fetch(`${API_BASE_URL}/bookings/confirm?slotID=${bookingState.selectedSlot}&customerID=${bookingState.customerID}`, {
            method: 'POST'
        });
    })
    .then(response => response.json())
    .then(data => {
        console.log('Booking confirmed:', data);
        bookingState.bookingID = data.bookingID;
        
        // Save booking to localStorage for settings page
        let bookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
        bookings.push({
            bookingID: bookingState.bookingID,
            salonName: bookingState.salonName,
            service: bookingState.selectedService,
            date: bookingState.selectedDate,
            slotID: bookingState.selectedSlot,
            paymentMethod: bookingState.paymentMethod,
            status: 'CONFIRMED',
            bookingDate: new Date().toISOString()
        });
        localStorage.setItem('userBookings', JSON.stringify(bookings));
        
        // Show success message
        goToStep(4);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Booking';
    })
    .catch(error => {
        console.error('Error confirming booking:', error);
        document.getElementById('paymentError').textContent = 'Error processing booking. Please try again.';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Booking';
    });
}

function goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from step indicators
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show selected step
    if (stepNumber === 4) {
        document.getElementById('successContent').classList.add('active');
    } else {
        document.getElementById(`step${stepNumber}-content`).classList.add('active');
        document.getElementById(`step${stepNumber}`).classList.add('active');
    }
}

function goToPreviousStep(currentStep) {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
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

// Format card number input
document.addEventListener('DOMContentLoaded', function() {
    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', function() {
            let value = this.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            this.value = formattedValue;
        });
    }
    
    const expiryInput = document.getElementById('cardExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            this.value = value;
        });
    }
});
