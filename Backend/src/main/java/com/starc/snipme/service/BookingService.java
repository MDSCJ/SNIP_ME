package com.starc.snipme.service;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.starc.snipme.model.Booking;
import com.starc.snipme.model.TimeSlot;
import com.starc.snipme.repository.BookingRepository;
import com.starc.snipme.repository.TimeSlotRepository;

@Service
public class BookingService {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private BookingRepository bookingRepository;

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
    public Booking confirmBooking(Long slotID, Long customerID) {
        
        // 1. Find the specific TimeSlot in the database
        TimeSlot slot = timeSlotRepository.findById(Objects.requireNonNull(slotID, "slotID must not be null"))
                .orElseThrow(() -> new RuntimeException("Time slot not found."));

        // 2. Security Check: Ensure the slot is actually locked before confirming
        if (!"LOCKED".equals(slot.getStatus())) {
            throw new RuntimeException("Cannot confirm: Slot is not locked or payment failed.");
        }

        // 3. Update the TimeSlot status to stop the 5-minute timeout sweeper
        slot.setStatus("CONFIRMED");
        slot.setLockedAt(null); // Clear the timer
        timeSlotRepository.save(slot);

        // 4. Create the official Booking object from your OOD
        Booking newBooking = new Booking(slot.getStartTime(), slot, customerID);
        newBooking.confirm(); // Uses the confirm() method from your class design to set status to "CONFIRMED"
        
        // 5. Save the Booking permanently to MySQL
        return bookingRepository.save(newBooking);
    }

    // The Cancellation Logic ---
    @Transactional
    public Booking cancelBooking(Long bookingID) {
        
        // 1. Find the active booking in the database
        Booking booking = bookingRepository.findById(Objects.requireNonNull(bookingID, "bookingID must not be null"))
                .orElseThrow(() -> new RuntimeException("Booking not found."));

        // 2. Prevent canceling an already canceled appointment
        if ("CANCELED".equals(booking.getStatus())) {
            throw new RuntimeException("This booking is already canceled.");
        }

        // 3. Update the Booking status
        // This uses the cancel() method you defined in your OOD Customer/Booking class design
        booking.cancel(); 
        bookingRepository.save(booking);

        // 4. Free the TimeSlot (ProcessCancellation -> FreeSlot)
        TimeSlot slot = booking.getTimeSlot();
        slot.setStatus("AVAILABLE");
        timeSlotRepository.save(slot);

        return booking;
    }
}