package com.starc.snipme.dto;

import com.starc.snipme.model.SalonNotification;
import java.time.LocalDateTime;

public class SalonNotificationDTO {
    
    private Long id;
    private Long salonId;
    private String message;
    private String type;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private Long relatedId;

    // Constructors
    public SalonNotificationDTO() {}

    public SalonNotificationDTO(SalonNotification notification) {
        this.id = notification.getId();
        this.salonId = notification.getSalonId();
        this.message = notification.getMessage();
        this.type = notification.getType();
        this.isRead = notification.getIsRead();
        this.createdAt = notification.getCreatedAt();
        this.relatedId = notification.getRelatedId();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSalonId() {
        return salonId;
    }

    public void setSalonId(Long salonId) {
        this.salonId = salonId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getRelatedId() {
        return relatedId;
    }

    public void setRelatedId(Long relatedId) {
        this.relatedId = relatedId;
    }
}
