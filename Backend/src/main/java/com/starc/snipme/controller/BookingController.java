package com.starc.snipme.controller;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

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

            java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("hh:mm a");
            List<Map<String,Object>> rows = allSlots.stream().map(slot -> {
                Map<String,Object> row = new HashMap<>();
                row.put("slotID", slot.getSlotID());
                row.put("startTime", slot.getStartTime() != null ? slot.getStartTime().toString() : null);
                row.put("startTimeLabel", slot.getStartTime() != null ? slot.getStartTime().format(fmt) : null);
                row.put("status", slot.getStatus());
                row.put("lockedAt", slot.getLockedAt() != null ? slot.getLockedAt().toString() : null);
                row.put("salon", slot.getSalon() != null ? Map.of("salonID", slot.getSalon().getSalonID(), "name", slot.getSalon().getName()) : null);

                String customerName = null;
                if (slot.getCustomer() != null) customerName = slot.getCustomer().getName() != null ? slot.getCustomer().getName() : slot.getCustomer().getEmail();
                else if (slot.getCustomerName() != null && !slot.getCustomerName().isBlank()) customerName = slot.getCustomerName();
                row.put("customerName", customerName);
                row.put("customerId", slot.getCustomer() != null ? slot.getCustomer().getId() : null);

                String serviceName = null;
                if (slot.getService() != null) serviceName = slot.getService().getName();
                else if (slot.getServiceName() != null && !slot.getServiceName().isBlank()) serviceName = slot.getServiceName();
                row.put("serviceName", serviceName);
                row.put("serviceId", slot.getService() != null ? slot.getService().getId() : null);

                return row;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not load dashboard data.");
        }
    }

    @PostMapping("/owner/add")
    public ResponseEntity<?> ownerAddAppointment(@RequestBody Map<String, Object> payload) {
        try {
            Long salonId = payload.get("salonID") == null ? null : Long.parseLong(payload.get("salonID").toString());
            String customerName = payload.get("customerName") == null ? null : payload.get("customerName").toString();
            Long serviceId = payload.get("serviceID") == null ? null : Long.parseLong(payload.get("serviceID").toString());
            String startTime = payload.get("startTime") == null ? null : payload.get("startTime").toString();

            if (salonId == null || startTime == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "salonID and startTime are required"));
            }

            TimeSlot created = bookingService.createOwnerAppointment(salonId, customerName, serviceId, startTime);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/customer")
    public ResponseEntity<?> getCustomerBookings(@RequestParam Long customerID) {
        try {
            List<Booking> bookings = bookingService.getBookingsForCustomer(customerID);

            List<Map<String, Object>> response = bookings.stream().map(booking -> {
                TimeSlot slot = booking.getTimeSlot();
                String paymentStatus = booking.getPayment() != null ? booking.getPayment().getPaymentStatus() : null;
                String orderId = booking.getPayment() != null ? booking.getPayment().getOrderId() : null;

                Map<String, Object> row = new HashMap<>();
                row.put("bookingID", booking.getBookingID());
                row.put("salonName", booking.getSalon() != null ? booking.getSalon().getName() : "");
                row.put("service", booking.getService() != null ? booking.getService().getName() : "");
                row.put("status", booking.getStatus());
                row.put("bookingDate", booking.getBookingDate() != null ? booking.getBookingDate().toString() : "");
                row.put("slotID", slot != null ? slot.getSlotID() : null);
                row.put("slotStartTime", slot != null && slot.getStartTime() != null ? slot.getStartTime().toString() : "");
                row.put("paymentStatus", paymentStatus == null ? "" : paymentStatus);
                row.put("orderId", orderId == null ? "" : orderId);
                return row;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Could not load customer bookings.");
        }
    }


}