package com.starc.snipme.controller;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.starc.snipme.model.TimeSlot;
import com.starc.snipme.model.Booking;
import com.starc.snipme.service.BookingService;
import com.starc.snipme.repository.TimeSlotRepository;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@CrossOrigin(origins = "*") // <-- This tells Spring Boot: "Allow HTML/JS files to talk to me!"s
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private BookingService bookingService;

    @GetMapping("/available")
    public ResponseEntity<?> getAvailableSlots() {
        try {
            // Fetches all slots where status = 'AVAILABLE'
            List<TimeSlot> availableSlots = timeSlotRepository.findByStatus("AVAILABLE");
            return ResponseEntity.ok(availableSlots);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not fetch slots");
        }
    }

    @GetMapping("/available-by-salon")
    public ResponseEntity<?> getAvailableSlotsBySalonAndDate(@RequestParam Long salonId,
                                                              @RequestParam String date) {
        try {
            LocalDate selectedDate = LocalDate.parse(date);
            LocalDateTime fromTime = selectedDate.atStartOfDay();
            LocalDateTime toTime = selectedDate.plusDays(1).atStartOfDay();

            List<TimeSlot> availableSlots = timeSlotRepository
                    .findMergedAvailableSlotsBySalonAndDate(salonId, fromTime, toTime);
            return ResponseEntity.ok(availableSlots);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Could not fetch salon/date availability");
        }
    }

    // The lock endpoint you already tested
    @PostMapping("/initiate")
    public ResponseEntity<?> initiateBooking(@RequestParam Long slotID, @RequestParam Long customerID) {
        try {
            TimeSlot lockedSlot = bookingService.initiateBooking(slotID, customerID);
            return ResponseEntity.ok("Slot held successfully. Proceed to payment for Slot ID: " + lockedSlot.getSlotID());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    // --- The Confirmation Endpoint ---
    // Developer 3 calls this after the credit card clears!
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmBooking(@RequestParam Long slotID, @RequestParam Long customerID) {
        try {
            // This calls the method YOU wrote earlier to permanently save the appointment!
            TimeSlot confirmedSlot = bookingService.confirmBooking(slotID, customerID);
            
            // In a real app, Developer 3's code would also save the Payment object to the database right here.
            
            return ResponseEntity.ok("Payment Successful! Appointment Confirmed. Slot ID: " + confirmedSlot.getSlotID());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/complete")
    public ResponseEntity<?> completeBooking(
            @RequestParam(required = false) Long slotID,
            @RequestParam Long customerID,
            @RequestParam Long salonID,
            @RequestParam Long serviceID,
            @RequestParam String startTime,
            @RequestParam String orderId,
            @RequestParam Double amount) {
        try {
            Booking booking = bookingService.completeBooking(slotID, customerID, salonID, serviceID, startTime, orderId, amount);
            return ResponseEntity.ok("Booking completed successfully with Booking ID: " + booking.getBookingID());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
    //The Cancellation Endpoint ---
    @PostMapping("/cancel")
    public ResponseEntity<?> cancelBooking(@RequestParam Long slotID) {
        try {
            // Triggers the service logic mapped to your Post-Booking Lifecycle diagram
            bookingService.cancelBooking(slotID);
            
            return ResponseEntity.ok("Appointment canceled successfully. The time slot is now available for other customers.");
            
        } catch (RuntimeException e) {
            // Returns a 400 Bad Request if the booking doesn't exist or is already canceled
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // DASHBOARD API: Fetch all time slots
    @GetMapping("/all")
    public ResponseEntity<?> getAllBookings() {
        try {
            List<TimeSlot> allSlots = timeSlotRepository.findAll();
            
            // Send the list back to Developer 3's frontend!
            return ResponseEntity.ok(allSlots);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not load dashboard data.");
        }
    }


}