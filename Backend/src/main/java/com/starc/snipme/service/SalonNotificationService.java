package com.starc.snipme.service;

import com.starc.snipme.model.SalonNotification;
import com.starc.snipme.repository.SalonNotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class SalonNotificationService {

    @Autowired
    private SalonNotificationRepository repository;

    public void createNotification(Long salonId, String message, String type, Long relatedId) {
        if (salonId == null) {
        throw new IllegalArgumentException("Salon ID cannot be null");
        }
        SalonNotification notification = new SalonNotification(salonId, message, type, relatedId);
        repository.save(notification);
    }

    public List<SalonNotification> getAllNotifications(Long salonId) {
        if (salonId == null) return java.util.Collections.emptyList();
        return repository.findBySalonIdOrderByCreatedAtDesc(salonId);
    }

    public List<SalonNotification> getUnreadNotifications(Long salonId) {
        if (salonId == null) return java.util.Collections.emptyList();
        return repository.findBySalonIdAndIsReadFalseOrderByCreatedAtDesc(salonId);
    }

    public long getUnreadCount(Long salonId) {
        if (salonId == null) return 0L;
        return repository.countBySalonIdAndIsReadFalse(salonId);
    }

    public void markAsRead(Long id) {
        //null value check
        if (id == null) return;
        repository.findById(id).ifPresent(n -> {
            n.setIsRead(true);
            repository.save(n);
        });
    }

    public void markAllAsRead(Long salonId) {
        List<SalonNotification> unread = repository.findBySalonIdAndIsReadFalseOrderByCreatedAtDesc(salonId);
        unread.forEach(n -> n.setIsRead(true));
        repository.saveAll(unread);
    }

    public void deleteNotification(Long id) {
        //null value check
        if (id == null) return;
        repository.deleteById(id);
    }
}