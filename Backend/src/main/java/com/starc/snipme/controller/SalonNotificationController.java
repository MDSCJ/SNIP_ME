package com.starc.snipme.controller;

import com.starc.snipme.model.SalonNotification;
import com.starc.snipme.service.SalonNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/salon-owner/notifications")
public class SalonNotificationController {

    @Autowired
    private SalonNotificationService service;

    @GetMapping("/{salonId}")
    public ResponseEntity<List<SalonNotification>> getNotifications(@PathVariable Long salonId) {
        return ResponseEntity.ok(service.getAllNotifications(salonId));
    }

    @GetMapping("/{salonId}/unread")
    public ResponseEntity<List<SalonNotification>> getUnread(@PathVariable Long salonId) {
        return ResponseEntity.ok(service.getUnreadNotifications(salonId));
    }

    @GetMapping("/{salonId}/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long salonId) {
        return ResponseEntity.ok(Map.of("unreadCount", service.getUnreadCount(salonId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        service.markAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PutMapping("/{salonId}/mark-all-read")
    public ResponseEntity<?> markAllRead(@PathVariable Long salonId) {
        service.markAllAsRead(salonId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        service.deleteNotification(id);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }
}