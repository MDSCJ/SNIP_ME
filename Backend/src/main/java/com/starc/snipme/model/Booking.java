package com.starc.snipme.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

<<<<<<< Updated upstream
=======
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

>>>>>>> Stashed changes
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long bookingID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceItem service;

<<<<<<< Updated upstream
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "slot_id")
=======
    // Customer relationship
    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    // Salon relationship
    @ManyToOne
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    // Service relationship
    @ManyToOne
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceItem service;

    // This tells MySQL to create a Foreign Key linking this booking to a specific time slot
    @OneToOne
    @JoinColumn(name = "slot_id", referencedColumnName = "slotID", nullable = false)
>>>>>>> Stashed changes
    private TimeSlot timeSlot;

    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL)
    private Payment payment;

    private String status; // PENDING, CONFIRMED, CANCELLED
    private LocalDateTime bookingDate;

    public Booking() {}

    public Long getBookingID() { return bookingID; }
    public void setBookingID(Long bookingID) { this.bookingID = bookingID; }

<<<<<<< Updated upstream
    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }
=======
    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }
    public void setBookingDate(LocalDateTime date) { this.date = date; }
>>>>>>> Stashed changes

    public Salon getSalon() { return salon; }
    public void setSalon(Salon salon) { this.salon = salon; }

    public ServiceItem getService() { return service; }
    public void setService(ServiceItem service) { this.service = service; }

    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }

    public Salon getSalon() { return salon; }
    public void setSalon(Salon salon) { this.salon = salon; }

    public ServiceItem getService() { return service; }
    public void setService(ServiceItem service) { this.service = service; }

    public TimeSlot getTimeSlot() { return timeSlot; }
    public void setTimeSlot(TimeSlot timeSlot) { this.timeSlot = timeSlot; }

    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDateTime bookingDate) { this.bookingDate = bookingDate; }
}
