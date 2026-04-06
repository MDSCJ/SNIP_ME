package com.starc.snipme.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_requests")
public class ServiceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "salon_id", nullable = false)
    private Long salonId;

    @Column(nullable = false)
    private String serviceName;

    @Column(columnDefinition = "LONGTEXT")
    private String description;

    @Column(nullable = false)
    private String status; // PENDING, APPROVED, REJECTED

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(columnDefinition = "LONGTEXT")
    private String adminNotes;

    @PrePersist
    public void onCreate() {
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "PENDING";
        }
    }

    // Constructors
    public ServiceRequest() {}

    public ServiceRequest(Long salonId, String serviceName, String description) {
        this.salonId = salonId;
        this.serviceName = serviceName;
        this.description = description;
        this.status = "PENDING";
        this.requestedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    
    public Long getSalonId() { return salonId; }
    public void setSalonId(Long salonId) { this.salonId = salonId; }
    
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
    
    public LocalDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(LocalDateTime respondedAt) { this.respondedAt = respondedAt; }
    
    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }
}
