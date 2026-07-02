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

    // ── Salon FK (always required) ────────────────────────
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    // ── States: "AVAILABLE", "LOCKED", "BOOKED" ───────────
    @Column(nullable = false)
    private String status = "AVAILABLE";

    // Tracks when the 5-minute lock started
    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "service_id")
    private Long serviceId;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "service_name")
    private String serviceName;

    // ── Getters / Setters ─────────────────────────────────
    public Long getSlotID() { return slotID; }
    public void setSlotID(Long slotID) { this.slotID = slotID; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public Salon getSalon() { return salon; }
    public void setSalon(Salon salon) { this.salon = salon; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public Long getServiceId() { return serviceId; }
    public void setServiceId(Long serviceId) { this.serviceId = serviceId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }

}