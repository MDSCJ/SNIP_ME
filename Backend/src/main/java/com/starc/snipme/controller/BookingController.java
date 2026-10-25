package com.starc.snipme.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.starc.snipme.model.TimeSlot;
import com.starc.snipme.model.User;
import com.starc.snipme.repository.TimeSlotRepository;
import com.starc.snipme.repository.UserRepository;
import com.starc.snipme.security.CurrentUser;
import com.starc.snipme.service.BookingService;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CurrentUser currentUser;

    /** The caller's own user id, or null if they are not a logged-in customer account. */
    private Long callerId(Authentication authentication) {
        return currentUser.user(authentication).map(User::getId).orElse(null);
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not allowed."));
    }

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
    public ResponseEntity<?> initiateBooking(@RequestParam Long slotID, @RequestParam Long customerID,
            Authentication authentication) {
        if (!customerID.equals(callerId(authentication))) {
            return forbidden();
        }
        try {
            TimeSlot lockedSlot = bookingService.initiateBooking(slotID, customerID);
            return ResponseEntity
                    .ok("Slot held successfully. Proceed to payment for Slot ID: " + lockedSlot.getSlotID());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    // --- The Confirmation Endpoint ---
    // Developer 3 calls this after the credit card clears!
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmBooking(@RequestParam Long slotID, @RequestParam Long customerID,
            Authentication authentication) {
        if (!customerID.equals(callerId(authentication))) {
            return forbidden();
        }
        try {
            // This calls the method YOU wrote earlier to permanently save the appointment!
            TimeSlot confirmedSlot = bookingService.confirmBooking(slotID, customerID);

            // In a real app, Developer 3's code would also save the Payment object to the
            // database right here.

            return ResponseEntity
                    .ok("Payment Successful! Appointment Confirmed. Slot ID: " + confirmedSlot.getSlotID());
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
            @RequestParam Double amount,
            Authentication authentication) {
        if (!customerID.equals(callerId(authentication))) {
            return forbidden();
        }
        try {
            Object booking = bookingService.completeBooking(slotID, customerID, salonID, serviceID, startTime, orderId,
                    amount);
            Object bookingId = invokeGetter(booking, "getBookingID");
            return ResponseEntity
                    .ok("Booking completed successfully with Booking ID: " + (bookingId != null ? bookingId : "N/A"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // The Cancellation Endpoint ---
    @PostMapping("/cancel")
    public ResponseEntity<?> cancelBooking(@RequestParam Long slotID, Authentication authentication) {
        TimeSlot slot = timeSlotRepository.findById(slotID).orElse(null);
        if (slot == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Booking not found.");
        }
        com.starc.snipme.model.Booking existing = bookingService.getBookingsForSlot(slotID);
        Long caller = callerId(authentication);
        boolean isBookingCustomer = existing != null && existing.getCustomer() != null && caller != null
                && caller.equals(existing.getCustomer().getId());
        boolean managesSalon = slot.getSalon() != null
                && currentUser.canManageSalon(authentication, slot.getSalon().getSalonID());
        if (!isBookingCustomer && !managesSalon) {
            return forbidden();
        }
        try {
            // Triggers the service logic mapped to your Post-Booking Lifecycle diagram
            bookingService.cancelBooking(slotID);

            return ResponseEntity
                    .ok("Appointment canceled successfully. The time slot is now available for other customers.");

        } catch (RuntimeException e) {
            // Returns a 400 Bad Request if the booking doesn't exist or is already canceled
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // ─── Real-time slot status polling ───────────────────────────────────────
    // Frontend calls this every few seconds while user is on Step 2.
    // Returns the list of ISO startTime strings that are BOOKED or LOCKED.
    @GetMapping("/taken-slots")
    public ResponseEntity<?> getTakenSlots(@RequestParam Long salonId,
            @RequestParam String date) {
        try {
            LocalDate selectedDate = LocalDate.parse(date);
            LocalDateTime fromTime = selectedDate.atStartOfDay();
            LocalDateTime toTime = selectedDate.plusDays(1).atStartOfDay();
            Set<String> takenTimes = bookingService.getUnavailableStartTimes(salonId, fromTime, toTime);
            return ResponseEntity.ok(takenTimes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Could not fetch slot status");
        }
    }

    // DASHBOARD API: Fetch all time slots
    @GetMapping("/all")
    public ResponseEntity<?> getAllBookings(Authentication authentication) {
        try {
            // Admins see everything, salon owners see their own salon with customer
            // details, everyone else only sees slot occupancy (no customer data).
            boolean admin = currentUser.isAdmin(authentication);
            Long ownSalonId = currentUser.ownedSalon(authentication)
                    .map(com.starc.snipme.model.Salon::getSalonID).orElse(null);

            List<TimeSlot> allSlots = timeSlotRepository.findAll().stream()
                    .filter(slot -> admin || ownSalonId == null
                            || (slot.getSalon() != null && ownSalonId.equals(slot.getSalon().getSalonID())))
                    .collect(Collectors.toList());

            java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("hh:mm a");
            List<Map<String, Object>> rows = allSlots.stream().map(slot -> {
                Map<String, Object> row = new HashMap<>();
                row.put("slotID", slot.getSlotID());
                row.put("startTime", slot.getStartTime() != null ? slot.getStartTime().toString() : null);
                row.put("startTimeLabel", slot.getStartTime() != null ? slot.getStartTime().format(fmt) : null);
                row.put("status", slot.getStatus());
                row.put("lockedAt", slot.getLockedAt() != null ? slot.getLockedAt().toString() : null);
                row.put("salon",
                        slot.getSalon() != null
                                ? Map.of("salonID", slot.getSalon().getSalonID(), "name", slot.getSalon().getName())
                                : null);

                // Read customer / service from the Booking entity (source of truth)
                com.starc.snipme.model.Booking booking = null;
                try {
                    booking = bookingService.getBookingsForSlot(slot.getSlotID());
                } catch (Exception ignored) {
                }

                String customerName = null;
                Long customerId = null;
                String serviceName = null;
                Long serviceId = null;

                if (booking != null) {
                    if (booking.getCustomer() != null) {
                        customerId = booking.getCustomer().getId();
                        customerName = booking.getCustomer().getName() != null
                                ? booking.getCustomer().getName()
                                : booking.getCustomer().getEmail();
                    }
                    if (booking.getService() != null) {
                        serviceId = booking.getService().getId();
                        serviceName = booking.getService().getName();
                    }
                }

                boolean showCustomer = admin || (ownSalonId != null && slot.getSalon() != null
                        && ownSalonId.equals(slot.getSalon().getSalonID()));
                if (!showCustomer) {
                    customerName = null;
                    customerId = null;
                }

                row.put("customerName", customerName);
                row.put("customerId", customerId);
                row.put("serviceName", serviceName);
                row.put("serviceId", serviceId);

                return row;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not load dashboard data.");
        }
    }

    @PostMapping("/owner/add")
    public ResponseEntity<?> ownerAddAppointment(@RequestBody Map<String, Object> payload,
            Authentication authentication) {
        try {
            Long salonId = payload.get("salonID") == null ? null : Long.parseLong(payload.get("salonID").toString());
            String customerName = payload.get("customerName") == null ? null : payload.get("customerName").toString();
            Long serviceId = payload.get("serviceID") == null ? null
                    : Long.parseLong(payload.get("serviceID").toString());
            String startTime = payload.get("startTime") == null ? null : payload.get("startTime").toString();

            if (salonId == null || startTime == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "salonID and startTime are required"));
            }
            if (!currentUser.canManageSalon(authentication, salonId)) {
                return forbidden();
            }

            TimeSlot created = bookingService.createOwnerAppointment(salonId, customerName, serviceId, startTime);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/customer")
    public ResponseEntity<?> getCustomerBookings(@RequestParam(required = false) Long customerID,
            @RequestParam(required = false) String email,
            Authentication authentication) {
        try {
            // Always the caller's own bookings, whatever IDs the client sends
            Long resolvedCustomerId = callerId(authentication);

            if (resolvedCustomerId == null) {
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }

            List<com.starc.snipme.model.Booking> bookings = bookingService.getBookingsForCustomer(resolvedCustomerId);

            List<Map<String, Object>> response = bookings.stream().map(b -> {
                Map<String, Object> row = new HashMap<>();
                row.put("bookingID", b.getBookingID());
                row.put("status", b.getStatus());
                row.put("bookingDate", b.getBookingDate() != null ? b.getBookingDate().toString() : "");

                if (b.getTimeSlot() != null) {
                    row.put("slotID", b.getTimeSlot().getSlotID());
                    row.put("slotStartTime",
                            b.getTimeSlot().getStartTime() != null ? b.getTimeSlot().getStartTime().toString() : "");
                } else {
                    row.put("slotID", null);
                    row.put("slotStartTime", "");
                }

                if (b.getSalon() != null) {
                    row.put("salonName", b.getSalon().getName());
                    row.put("salonId", b.getSalon().getSalonID());
                } else {
                    row.put("salonName", "");
                    row.put("salonId", null);
                }

                if (b.getService() != null) {
                    row.put("service", b.getService().getName());
                    row.put("serviceId", b.getService().getId());
                } else {
                    row.put("service", "");
                    row.put("serviceId", null);
                }

                if (b.getCustomer() != null) {
                    row.put("customerId", b.getCustomer().getId());
                    row.put("customerName",
                            b.getCustomer().getName() != null ? b.getCustomer().getName() : b.getCustomer().getEmail());
                } else {
                    row.put("customerId", null);
                    row.put("customerName", "");
                }

                if (b.getPayment() != null) {
                    row.put("paymentStatus", b.getPayment().getPaymentStatus());
                    row.put("orderId", b.getPayment().getOrderId());
                } else {
                    row.put("paymentStatus", "");
                    row.put("orderId", "");
                }

                return row;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log and return an empty list so the frontend shows no bookings instead of an
            // error page
            System.err.println("Error loading customer bookings: " + e.getMessage());
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }

    private Object invokeGetter(Object target, String getterName) {
        if (target == null || getterName == null || getterName.isEmpty()) {
            return null;
        }
        try {
            return target.getClass().getMethod(getterName).invoke(target);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String asString(Object value) {
        return value == null ? "" : value.toString();
    }

}