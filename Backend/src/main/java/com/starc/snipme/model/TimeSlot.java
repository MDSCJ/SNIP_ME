package com.starc.snipme.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;



@Entity
@Table(name = "time_slots")
public class TimeSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long slotID;

    @Column(nullable = false)
    private LocalDateTime startTime;

    // States: "AVAILABLE", "LOCKED", "BOOKED"
    @Column(nullable = false)
    private String status = "AVAILABLE"; 

    // Tracks when the 5-minute lock started
    private LocalDateTime lockedAt; 

    // --- Getters and Setters ---
    public Long getSlotID() { return slotID; }
    public void setSlotID(Long slotID) { this.slotID = slotID; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }
}