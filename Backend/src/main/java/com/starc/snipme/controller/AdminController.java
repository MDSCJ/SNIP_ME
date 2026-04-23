package com.starc.snipme.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;

import com.starc.snipme.model.AdminNotification;
import com.starc.snipme.model.Salon;
import com.starc.snipme.model.ServiceItem;
import com.starc.snipme.model.ServiceRequest;
import com.starc.snipme.model.User;
import com.starc.snipme.repository.AdminNotificationRepository;
import com.starc.snipme.repository.SalonRepository;
import com.starc.snipme.repository.ServiceItemRepository;
import com.starc.snipme.repository.ServiceRequestRepository;
import com.starc.snipme.repository.UserRepository;
import com.starc.snipme.service.LoginSessionTracker;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final SalonRepository salonRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final AdminNotificationRepository adminNotificationRepository;
    private final LoginSessionTracker loginSessionTracker;

    public AdminController(UserRepository userRepository,
                           SalonRepository salonRepository,
                           ServiceItemRepository serviceItemRepository,
                           ServiceRequestRepository serviceRequestRepository,
                           AdminNotificationRepository adminNotificationRepository,
                           LoginSessionTracker loginSessionTracker) {
        this.userRepository = userRepository;
        this.salonRepository = salonRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.adminNotificationRepository = adminNotificationRepository;
        this.loginSessionTracker = loginSessionTracker;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        long totalUsers = userRepository.count();
        long totalSalons = salonRepository.count();
        int loggedInUsers = loginSessionTracker.countLoggedInUsers();
        int loggedInSalonOwners = loginSessionTracker.countLoggedInSalonOwners();

        return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "totalSalons", totalSalons,
                "loggedInUsers", loggedInUsers,
            "loggedInSalonOwners", loggedInSalonOwners
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(@RequestParam(name = "query", required = false) String query,
                                      Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        String q = query == null ? "" : query.trim().toLowerCase();

        List<Map<String, Object>> users = userRepository.findAll().stream()
                .filter(user -> q.isBlank() || containsUser(user, q))
                .map(this::toUserDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    @GetMapping("/salons")
    public ResponseEntity<?> getSalons(@RequestParam(name = "query", required = false) String query,
                                       Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        String q = query == null ? "" : query.trim().toLowerCase();

        List<Map<String, Object>> salons = salonRepository.findAll().stream()
                .filter(salon -> q.isBlank() || containsSalon(salon, q))
                .map(this::toSalonDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(salons);
    }

    @PutMapping("/salons/{id}/ban")
    public ResponseEntity<?> banSalon(@PathVariable("id") Long id, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        return salonRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .map(salon -> {
                    salon.setActive(false);
                    salonRepository.save(salon);
                    return ResponseEntity.ok(Map.of("message", "Salon banned successfully."));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Salon not found.")));
    }

    @PutMapping("/salons/{id}/unban")
    public ResponseEntity<?> unbanSalon(@PathVariable("id") Long id, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        return salonRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .map(salon -> {
                    salon.setActive(true);
                    salonRepository.save(salon);
                    return ResponseEntity.ok(Map.of("message", "Salon unbanned successfully."));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Salon not found.")));
    }

    @PutMapping("/users/{email}")
    public ResponseEntity<?> updateUser(@PathVariable("email") String email,
                                        @RequestBody Map<String, String> payload,
                                        Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> {
                    String name = payload.get("name");
                    String phone = payload.get("phoneNumber");
                    String userType = payload.get("userType");

                    if (name != null) {
                        user.setName(name.isBlank() ? null : name.trim());
                    }

                    if (phone != null) {
                        user.setPhoneNumber(phone.isBlank() ? null : phone.trim());
                    }

                    if (userType != null && !userType.isBlank()) {
                        user.setUserType(userType.trim().toUpperCase());
                    }

                    userRepository.save(Objects.requireNonNull(user, "user must not be null"));
                    return ResponseEntity.ok(Map.of("message", "User updated successfully."));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found.")));
    }

    @DeleteMapping("/users/{email}")
    public ResponseEntity<?> deleteUser(@PathVariable("email") String email, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        var userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found."));
        }

        userRepository.delete(Objects.requireNonNull(userOpt.get(), "user must not be null"));
        return ResponseEntity.ok(Map.of("message", "User deleted successfully."));
    }

    @PostMapping("/services")
    public ResponseEntity<?> addService(@RequestBody Map<String, Object> payload, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        String name = payload.get("name") == null ? "" : payload.get("name").toString().trim();
        if (name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Service name is required."));
        }

        ServiceItem item = new ServiceItem();
        item.setName(name);
        item.setSalonId(null);

        Object includeObj = payload.get("includeInSearch");
        if (includeObj != null) {
            item.setIncludeInSearch(Boolean.parseBoolean(includeObj.toString()));
        }

        serviceItemRepository.save(item);
        return ResponseEntity.ok(Map.of("message", "Service added successfully."));
    }

    @GetMapping("/services")
    public ResponseEntity<?> getServices(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        List<Map<String, Object>> services = serviceItemRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(this::toServiceDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(services);
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<?> deleteService(@PathVariable("id") Long id, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        Long serviceId = Objects.requireNonNull(id, "id must not be null");

        if (!serviceItemRepository.existsById(serviceId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Service not found."));
        }

        serviceItemRepository.deleteById(serviceId);
        return ResponseEntity.ok(Map.of("message", "Service deleted successfully."));
    }

    @GetMapping("/service-requests")
    public ResponseEntity<?> getServiceRequests(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        List<ServiceRequest> requests = serviceRequestRepository.findByStatusOrderByRequestedAtDesc("PENDING");
        return ResponseEntity.ok(Map.of("requests", requests));
    }

    @PutMapping("/service-requests/{id}/approve")
    public ResponseEntity<?> approveServiceRequest(@PathVariable("id") Long id,
                                                    @RequestBody(required = false) Map<String, String> payload,
                                                    Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        return serviceRequestRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .map(request -> {
                    // Create and add the service
                    ServiceItem newService = new ServiceItem();
                    newService.setName(request.getServiceName());
                    newService.setSalonId(request.getSalonId());
                    newService.setIncludeInSearch(true);
                    serviceItemRepository.save(newService);

                    // Update request status
                    request.setStatus("APPROVED");
                    request.setRespondedAt(java.time.LocalDateTime.now());
                    String adminNotes = (payload != null) ? payload.get("notes") : null;
                    if (adminNotes != null && !adminNotes.isBlank()) {
                        request.setAdminNotes(adminNotes);
                    }
                    serviceRequestRepository.save(request);

                    return ResponseEntity.ok(Map.of(
                            "message", "Service approved and added successfully.",
                            "serviceId", newService.getId()
                    ));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found.")));
    }

    @PutMapping("/service-requests/{id}/reject")
    public ResponseEntity<?> rejectServiceRequest(@PathVariable("id") Long id,
                                                   @RequestBody(required = false) Map<String, String> payload,
                                                   Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        return serviceRequestRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .map(request -> {
                    request.setStatus("REJECTED");
                    request.setRespondedAt(java.time.LocalDateTime.now());
                    String adminNotes = (payload != null) ? payload.get("notes") : null;
                    if (adminNotes != null && !adminNotes.isBlank()) {
                        request.setAdminNotes(adminNotes);
                    }
                    serviceRequestRepository.save(request);

                    return ResponseEntity.ok(Map.of("message", "Service request rejected."));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Request not found.")));
    }

    private boolean containsUser(User user, String q) {
        return contains(user.getEmail(), q)
                || contains(user.getName(), q)
                || contains(user.getPhoneNumber(), q)
                || contains(user.getUserType(), q);
    }

    private boolean containsSalon(Salon salon, String q) {
        return contains(salon.getName(), q)
                || contains(salon.getDetails(), q)
                || contains(salon.getAddress(), q)
                || contains(salon.getCity(), q)
                || contains(salon.getEmail(), q)
                || contains(salon.getPhoneNumber(), q);
    }

    private boolean contains(String value, String q) {
        return value != null && value.toLowerCase().contains(q);
    }

    private Map<String, Object> toUserDto(User user) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", user.getId());
        dto.put("email", user.getEmail());
        dto.put("name", user.getName());
        dto.put("phoneNumber", user.getPhoneNumber());
        dto.put("userType", user.getUserType());
        return dto;
    }

    private Map<String, Object> toSalonDto(Salon salon) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("salonID", salon.getSalonID());
        dto.put("name", salon.getName());
        dto.put("details", salon.getDetails());
        dto.put("address", salon.getAddress());
        dto.put("city", salon.getCity());
        dto.put("phoneNumber", salon.getPhoneNumber());
        dto.put("email", salon.getEmail());
        dto.put("ownerUserId", salon.getOwnerUserId());
        dto.put("isActive", salon.isActive());
        dto.put("rate", salon.getRate());
        dto.put("nOfRatings", salon.getNOfRatings());
        return dto;
    }

    private Map<String, Object> toServiceDto(ServiceItem item) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", item.getId());
        dto.put("name", item.getName());
        dto.put("salonId", item.getSalonId());
        dto.put("includeInSearch", item.isIncludeInSearch());
        return dto;
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        try {
            // Best-effort cleanup: do not block notification fetch if cleanup fails.
            try {
                java.time.LocalDateTime cutoffDate = java.time.LocalDateTime.now().minusDays(30);
                adminNotificationRepository.deleteOlderThan(cutoffDate);
            } catch (Exception cleanupError) {
                System.err.println("Notification cleanup failed: " + cleanupError.getMessage());
            }

            // Get all notifications
            List<AdminNotification> notifications = adminNotificationRepository.findAllByOrderByCreatedAtDesc();
            
            List<Map<String, Object>> notificationDtos = notifications.stream().map(notif -> {
                Map<String, Object> dto = new LinkedHashMap<>();
                dto.put("id", notif.getId());
                dto.put("salonId", notif.getSalonId());
                dto.put("message", notif.getMessage());
                dto.put("type", notif.getType());
                dto.put("isRead", notif.getIsRead());
                dto.put("createdAt", notif.getCreatedAt() != null ? notif.getCreatedAt().toString() : null);
                dto.put("relatedId", notif.getRelatedId());
                return dto;
            }).collect(java.util.stream.Collectors.toList());

            long unreadCount = adminNotificationRepository.countByIsReadFalse();
            
            return ResponseEntity.ok(Map.of(
                "notifications", notificationDtos,
                "unreadCount", unreadCount
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch notifications: " + e.getMessage()));
        }
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<?> markNotificationAsRead(@PathVariable Long id, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        try {
            return adminNotificationRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .map(notif -> {
                    notif.setIsRead(true);
                    adminNotificationRepository.save(notif);
                    return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Notification not found")));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to update notification: " + e.getMessage()));
        }
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<?> getUnreadNotificationCount(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }

        long unreadCount = adminNotificationRepository.countByIsReadFalse();
        return ResponseEntity.ok(Map.of("unreadCount", unreadCount));
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if ("ROLE_ADMIN".equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
