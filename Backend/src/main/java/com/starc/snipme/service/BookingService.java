package com.starc.snipme.service;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.starc.snipme.model.TimeSlot;
import com.starc.snipme.repository.TimeSlotRepository;

import com.starc.snipme.service.SalonNotificationService;

@Service
public class BookingService {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private SalonNotificationService salonNotificationService;
    // This method perfectly matches the "1.1 InitiateBooking" call in your sequence diagram
    @Transactional
    public TimeSlot initiateBooking(Long slotID, Long customerID) {
        
        // 1. TryLockSlot: Triggers the PESSIMISTIC_WRITE lock we built earlier
        Optional<TimeSlot> optionalSlot = timeSlotRepository.lockSlotForBooking(slotID);

        if (optionalSlot.isPresent()) {
            TimeSlot slot = optionalSlot.get();
            
            // 2. Return Lock Success (State -> Locked/Reserved)
            slot.setStatus("LOCKED"); 
            slot.setLockedAt(LocalDateTime.now()); // Starts the 5-minute timeout timer
            
            // Note: In a full implementation, you would also create and save a new Booking object here, 
            // linking it to the customerID before requesting payment.
            
            return timeSlotRepository.save(slot); 
        } else {
            // 3. Return Lock Failed (Slot Unavailable)
            // Throws an error if another user A already locked it while user B was looking at the screen
            throw new RuntimeException("Slot already taken. Please reselect."); 
        }
    }

    @Transactional
    public TimeSlot confirmBooking(Long slotID, Long customerID) {
        //null value checking
        if (slotID == null || customerID == null) {
        throw new IllegalArgumentException("Slot ID and Customer ID must not be null.");
        }
        // 1. Find the specific TimeSlot in the database
        TimeSlot slot = timeSlotRepository.findById(Objects.requireNonNull(slotID, "slotID must not be null"))
                .orElseThrow(() -> new RuntimeException("Time slot not found."));

        // 2. Security Check: Ensure the slot is actually locked before confirming
        if (!"LOCKED".equals(slot.getStatus())) {
            throw new RuntimeException("Cannot confirm: Slot is not locked or payment failed.");
        }

        // 3. Update the TimeSlot status to stop the 5-minute timeout sweeper
        // Keep the slot state aligned with TimeSlot model states.
        slot.setStatus("BOOKED");
        slot.setLockedAt(null); // Clear the timer
        slot.setCustomerID(customerID); // Store who booked this slot
        timeSlotRepository.save(slot);

        // --- SALON NOTIFICATION TRIGGER ---
        // Dynamically retrieve the salon ID from the slot
        Long salonId = slot.getSalon().getSalonID(); 

        salonNotificationService.createNotification(
            salonId, 
            "New booking confirmed for " + slot.getStartTime(), 
            "BOOKING_CONFIRMED", 
            slot.getSlotID()
        );



        return slot;

        
    }

    // The Cancellation Logic ---
    @Transactional
    public TimeSlot cancelBooking(Long slotID) {
        // null value check 
        if (slotID == null) {
        throw new IllegalArgumentException("Slot ID must not be null.");
        }
        // 1. Find the slot in the database
        TimeSlot slot = timeSlotRepository.findById(Objects.requireNonNull(slotID, "slotID must not be null"))
                .orElseThrow(() -> new RuntimeException("Time slot not found."));

        // 2. Prevent canceling when slot is already open
        if ("AVAILABLE".equals(slot.getStatus())) {
            throw new RuntimeException("This slot is already available.");
        }

        // 3. Free the TimeSlot
        slot.setStatus("AVAILABLE");
        slot.setLockedAt(null);
        timeSlotRepository.save(slot);

        Long salonId = slot.getSalon().getSalonID();

        salonNotificationService.createNotification(
            salonId, 
            "Booking cancelled for " + slot.getStartTime(), 
            "BOOKING_CANCELLED", 
            slot.getSlotID()
        );
        return slot;
    }
}