package com.starc.snipme.controller;

import com.starc.snipme.model.SalonNotification;
import com.starc.snipme.repository.SalonNotificationRepository;
import com.starc.snipme.security.CurrentUser;
import com.starc.snipme.service.SalonNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/salon-owner/notifications")
public class SalonNotificationController {

    @Autowired
    private SalonNotificationService service;

    @Autowired
    private SalonNotificationRepository notificationRepository;

    @Autowired
    private CurrentUser currentUser;

    private static ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not allowed."));
    }

    private boolean canManageNotification(Authentication authentication, Long id) {
        return notificationRepository.findById(id)
                .map(SalonNotification::getSalonId)
                .map(salonId -> currentUser.canManageSalon(authentication, salonId))
                .orElse(false);
    }

    @GetMapping("/{salonId}")
    public ResponseEntity<?> getNotifications(@PathVariable Long salonId, Authentication authentication) {
        if (!currentUser.canManageSalon(authentication, salonId)) return forbidden();
        return ResponseEntity.ok(service.getAllNotifications(salonId));
    }

    @GetMapping("/{salonId}/unread")
    public ResponseEntity<?> getUnread(@PathVariable Long salonId, Authentication authentication) {
        if (!currentUser.canManageSalon(authentication, salonId)) return forbidden();
        return ResponseEntity.ok(service.getUnreadNotifications(salonId));
    }

    @GetMapping("/{salonId}/unread-count")
    public ResponseEntity<?> getUnreadCount(@PathVariable Long salonId, Authentication authentication) {
        if (!currentUser.canManageSalon(authentication, salonId)) return forbidden();
        return ResponseEntity.ok(Map.of("unreadCount", service.getUnreadCount(salonId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Authentication authentication) {
        if (!canManageNotification(authentication, id)) return forbidden();
        service.markAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PutMapping("/{salonId}/mark-all-read")
    public ResponseEntity<?> markAllRead(@PathVariable Long salonId, Authentication authentication) {
        if (!currentUser.canManageSalon(authentication, salonId)) return forbidden();
        service.markAllAsRead(salonId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        if (!canManageNotification(authentication, id)) return forbidden();
        service.deleteNotification(id);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }
}
