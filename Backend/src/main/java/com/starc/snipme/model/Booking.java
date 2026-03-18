package com.starc.snipme.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long bookingID;

    @Column(nullable = false)
    private LocalDateTime date;

    @Column(nullable = false)
    private String status; 

    // --- NEW: The Object Relationships ---

    // This tells MySQL to create a Foreign Key linking this booking to a specific time slot
    @OneToOne
    @JoinColumn(name = "slot_id", referencedColumnName = "slotID", nullable = false)
    private TimeSlot timeSlot;

    // We store the customer's ID here. 
    // (Once Developer 1 finishes the Customer class, you can change this to a @ManyToOne relationship!)
    @Column(nullable = false)
    private Long customerID;

    // Constructors
    public Booking() {}

    public Booking(LocalDateTime date, TimeSlot timeSlot, Long customerID) {
        this.date = date;
        this.status = "PENDING";
        this.timeSlot = timeSlot;
        this.customerID = customerID;
    }

    // --- Getters and Setters ---
    public Long getBookingID() { return bookingID; }
    public void setBookingID(Long bookingID) { this.bookingID = bookingID; }

    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public TimeSlot getTimeSlot() { return timeSlot; }
    public void setTimeSlot(TimeSlot timeSlot) { this.timeSlot = timeSlot; }

    public Long getCustomerID() { return customerID; }
    public void setCustomerID(Long customerID) { this.customerID = customerID; }

    // --- Methods from your OOD ---
    // These align with your OOD class structure methods[cite: 151].
    public void confirm() {
        this.status = "CONFIRMED";
    }

    public void cancel() {
        this.status = "CANCELED";
    }
}