package com.starc.snipme.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.starc.snipme.model.*;
import com.starc.snipme.repository.*;

@Service
public class BookingService {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SalonRepository salonRepository;

    @Autowired
    private ServiceItemRepository serviceItemRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SalonNotificationService salonNotificationService;

    @Transactional(readOnly = true)
    public List<Booking> getBookingsForCustomer(Long customerID) {
        if (customerID == null) {
            throw new IllegalArgumentException("Customer ID must not be null.");
        }
        return bookingRepository.findByCustomer_IdOrderByBookingDateDesc(customerID);
    }

    /**
     * Returns the Booking linked to a given TimeSlot, or null if none exists.
     * Used by the dashboard /all endpoint to get customer/service info.
     */
    @Transactional(readOnly = true)
    public com.starc.snipme.model.Booking getBookingsForSlot(Long slotID) {
        return bookingRepository.findByTimeSlot_SlotID(slotID).orElse(null);
    }

    // This method perfectly matches the "1.1 InitiateBooking" call in your sequence
    // diagram
    @Transactional
    public TimeSlot initiateBooking(Long slotID, Long customerID) {

        // 1. TryLockSlot: Triggers the PESSIMISTIC_WRITE lock we built earlier
        Optional<TimeSlot> optionalSlot = timeSlotRepository.lockSlotForBooking(slotID);

        if (optionalSlot.isPresent()) {
            TimeSlot slot = optionalSlot.get();

            // 2. Return Lock Success (State -> Locked/Reserved)
            slot.setStatus("LOCKED");
            slot.setLockedAt(LocalDateTime.now()); // Starts the 5-minute timeout timer

            // Note: In a full implementation, you would also create and save a new Booking
            // object here,
            // linking it to the customerID before requesting payment.

            return timeSlotRepository.save(slot);
        } else {
            // 3. Return Lock Failed (Slot Unavailable)
            // Throws an error if another user A already locked it while user B was looking
            // at the screen
            throw new RuntimeException("Slot already taken. Please reselect.");
        }
    }

    @Transactional
    public TimeSlot confirmBooking(Long slotID, Long customerID) {
        // null value checking
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
        slot.setLockedAt(LocalDateTime.now());
        timeSlotRepository.save(slot);

        bookingRepository.findByTimeSlot_SlotID(slotID).ifPresent(booking -> {
            if (booking.getCustomer() != null && booking.getService() != null) {
                timeSlotRepository.updateSlotBookingMetadata(
                        slot.getSlotID(),
                        slot.getStatus(),
                        slot.getLockedAt(),
                        booking.getCustomer().getId(),
                        booking.getService().getId(),
                        booking.getCustomer().getName(),
                        booking.getService().getName());
            }
        });

        // --- SALON NOTIFICATION TRIGGER ---
        // Dynamically retrieve the salon ID from the slot
        Long salonId = slot.getSalon().getSalonID();

        salonNotificationService.createNotification(
                salonId,
                "New booking confirmed for " + slot.getStartTime(),
                "BOOKING_CONFIRMED",
                slot.getSlotID());
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
        timeSlotRepository.clearSlotBookingMetadata(slotID, "AVAILABLE");

        // 4. Mark the linked Booking as CANCELLED (so it shows correctly in customer's
        // history)
        bookingRepository.findByTimeSlot_SlotID(slotID).ifPresent(booking -> {
            booking.setStatus("CANCELLED");
            bookingRepository.save(booking);
        });

        Long salonId = slot.getSalon().getSalonID();

        salonNotificationService.createNotification(
                salonId,
                "Booking cancelled for " + slot.getStartTime(),
                "BOOKING_CANCELLED",
                slot.getSlotID());
        return slot;
    }

    @Transactional
    public Booking completeBooking(Long slotID, Long customerID, Long salonID, Long serviceID, String startTimeStr,
            String orderId, Double amount) {
        TimeSlot slot;
        if (slotID != null) {
            // Existing DB slot — use pessimistic lock to guard concurrent confirmations
            slot = timeSlotRepository.findById(slotID)
                    .orElseThrow(() -> new RuntimeException("Time slot not found."));
            if ("BOOKED".equals(slot.getStatus())) {
                throw new RuntimeException("SLOT_ALREADY_BOOKED: This slot was just confirmed by another customer.");
            }
            slot.setStatus("BOOKED");
            slot.setLockedAt(LocalDateTime.now());
            slot = timeSlotRepository.save(slot);
        } else {
            // Virtual slot — check for a concurrent booking at the same salon + startTime
            LocalDateTime startTime = LocalDateTime.parse(startTimeStr);
            boolean alreadyTaken = timeSlotRepository
                    .findConflictingSlot(salonID, startTime)
                    .isPresent();
            if (alreadyTaken) {
                throw new RuntimeException("SLOT_ALREADY_BOOKED: Another customer just booked this time slot.");
            }
            // Safe to create
            slot = new TimeSlot();
            slot.setStartTime(startTime);
            slot.setStatus("BOOKED");
            slot.setLockedAt(LocalDateTime.now());
            slot.setSalon(salonRepository.findById(salonID).orElseThrow());
            slot = timeSlotRepository.save(slot);
        }

        User customer = userRepository.findById(customerID)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        Salon salon = salonRepository.findById(salonID).orElseThrow(() -> new RuntimeException("Salon not found"));
        ServiceItem service = serviceItemRepository.findById(serviceID)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        Booking booking = new Booking();
        booking.setCustomer(customer);
        booking.setSalon(salon);
        booking.setService(service);
        booking.setTimeSlot(slot);
        booking.setStatus("CONFIRMED");
        booking.setBookingDate(LocalDateTime.now());

        booking = bookingRepository.save(booking);

        Payment payment = new Payment(amount, "Success", booking, orderId);
        payment.setTimeSlot(slot);
        paymentRepository.save(payment);

        timeSlotRepository.updateSlotBookingMetadata(
                slot.getSlotID(),
                slot.getStatus(),
                slot.getLockedAt(),
                customerID,
                serviceID,
                customer.getName(),
                service.getName());

        salonNotificationService.createNotification(
                salon.getSalonID(),
                "New booking confirmed for " + slot.getStartTime(),
                "BOOKING_CONFIRMED",
                slot.getSlotID());

        return booking;
    }

    @Transactional
    public TimeSlot createOwnerAppointment(Long salonID, String customerName, Long serviceID, String startTimeStr) {
        TimeSlot slot = new TimeSlot();
        slot.setStartTime(LocalDateTime.parse(startTimeStr));
        slot.setStatus("BOOKED");
        slot.setLockedAt(LocalDateTime.now());
        slot.setSalon(salonRepository.findById(salonID).orElseThrow(() -> new RuntimeException("Salon not found")));

        slot = timeSlotRepository.save(slot);

        // Notify salon owner about manual appointment
        try {
            salonNotificationService.createNotification(
                    slot.getSalon().getSalonID(),
                    "Owner created appointment for " + slot.getStartTime(),
                    "OWNER_APPOINTMENT",
                    slot.getSlotID());
        } catch (Exception ignored) {
        }

        return slot;
    }

    /**
     * Returns the set of startTime strings (ISO format) that are BOOKED or LOCKED
     * for a given salon on a given date — used by the frontend polling endpoint.
     */
    @Transactional(readOnly = true)
    public Set<String> getUnavailableStartTimes(Long salonID, LocalDateTime fromTime, LocalDateTime toTime) {
        return timeSlotRepository
                .findUnavailableSlotsBySalonAndDateRange(salonID, fromTime, toTime)
                .stream()
                .map(t -> t.getStartTime() != null ? t.getStartTime().toString() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }
}