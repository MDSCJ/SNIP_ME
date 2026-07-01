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
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id")
    private User customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_id")
    private com.starc.snipme.model.ServiceItem service;
    
    // Optional human-readable names when an appointment is created by owner (no user record)
    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "service_name")
    private String serviceName;
    //--------------------------------------------------------------------
    // States: "AVAILABLE", "LOCKED", "BOOKED"
    @Column(nullable = false)
    private String status = "AVAILABLE"; 

    // Tracks when the 5-minute lock started
    private LocalDateTime lockedAt;

    public Salon getSalon() { return salon; }
    public void setSalon(Salon salon) { this.salon = salon; }
    
    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }

    public com.starc.snipme.model.ServiceItem getService() { return service; }
    public void setService(com.starc.snipme.model.ServiceItem service) { this.service = service; }
    
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    
    public Long getSlotID() { return slotID; }
    public void setSlotID(Long slotID) { this.slotID = slotID; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }


}