package com.starc.snipme.model;

import java.time.LocalDateTime;

//import jakarta.persistence.Column;
//import jakarta.persistence.Entity;
//import jakarta.persistence.GeneratedValue;
//import jakarta.persistence.GenerationType;
//import jakarta.persistence.Id;
//import jakarta.persistence.Table;
import jakarta.persistence.*;


@Entity
@Table(name = "time_slots")
public class TimeSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long slotID;

    @Column(nullable = false)
    private LocalDateTime startTime;
    //---------------------------------------------------------------------
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;
    //--------------------------------------------------------------------
    // States: "AVAILABLE", "LOCKED", "BOOKED"
    @Column(nullable = false)
    private String status = "AVAILABLE"; 

    // Tracks when the 5-minute lock started
    private LocalDateTime lockedAt;

    // Customer who booked this slot
    private Long customerID;

    // Service booked for this slot
    private Long serviceID; 

    // --- Getters and Setters ---
    public Salon getSalon() { return salon; }
    public void setSalon(Salon salon) { this.salon = salon; }
    
    public Long getSlotID() { return slotID; }
    public void setSlotID(Long slotID) { this.slotID = slotID; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }

    public Long getCustomerID() { return customerID; }
    public void setCustomerID(Long customerID) { this.customerID = customerID; }

    public Long getServiceID() { return serviceID; }
    public void setServiceID(Long serviceID) { this.serviceID = serviceID; }
}