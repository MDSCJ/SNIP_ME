package com.starc.snipme.controller;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.starc.snipme.model.AdminNotification;
import com.starc.snipme.model.ServiceItem;
import com.starc.snipme.model.ServicePrice;
import com.starc.snipme.model.ServiceRequest;
import com.starc.snipme.repository.AdminNotificationRepository;
import com.starc.snipme.repository.ServiceItemRepository;
import com.starc.snipme.repository.ServicePriceRepository;
import com.starc.snipme.repository.ServiceRequestRepository;

@RestController
@RequestMapping("/api/salon-owner/services")
public class SalonOwnerServiceController {

    private final ServiceItemRepository serviceItemRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final ServicePriceRepository servicePriceRepository;
    private final AdminNotificationRepository adminNotificationRepository;

    public SalonOwnerServiceController(ServiceItemRepository serviceItemRepository, 
                                      ServiceRequestRepository serviceRequestRepository,
                                      ServicePriceRepository servicePriceRepository,
                                      AdminNotificationRepository adminNotificationRepository) {
        this.serviceItemRepository = serviceItemRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.servicePriceRepository = servicePriceRepository;
        this.adminNotificationRepository = adminNotificationRepository;
    }

    /**
     * Get all active services for a specific salon
     */
    @GetMapping("/by-salon/{salonId}")
    public ResponseEntity<?> getSalonServices(@PathVariable Long salonId) {
        try {
            List<ServiceItem> services = serviceItemRepository
                .findByIsActiveTrueOrderByNameAsc();
            
            // Filter services for the salon
            List<ServiceItem> salonServices = services.stream()
                .filter(s -> s.getSalonId() == null || s.getSalonId().equals(salonId))
                .toList();
            
            if (salonServices.isEmpty()) {
                return ResponseEntity.ok(Map.of("message", "No services available yet", "services", List.of()));
            }
            
            return ResponseEntity.ok(Map.of("services", salonServices));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch services: " + e.getMessage()));
        }
    }

    /**
     * Get all available services from the database
     */
    @GetMapping("/available")
    public ResponseEntity<?> getAvailableServices() {
        try {
            List<ServiceItem> services = serviceItemRepository.findByIsActiveTrueOrderByNameAsc();
            System.out.println("DEBUG: getAvailableServices - Found " + services.size() + " active services");
            services.forEach(s -> System.out.println("  - Service: " + s.getName() + " (ID: " + s.getId() + ", isActive: " + s.isActive() + ")"));
            return ResponseEntity.ok(Map.of("services", services));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch services: " + e.getMessage()));
        }
    }

    /**
     * DEBUG ENDPOINT: Get ALL services (including inactive ones)
     */
    @GetMapping("/debug/all-services")
    public ResponseEntity<?> debugAllServices() {
        try {
            List<ServiceItem> allServices = serviceItemRepository.findAll();
            System.out.println("DEBUG: getAllServices - Found " + allServices.size() + " total services");
            allServices.forEach(s -> System.out.println("  - Service: " + s.getName() + " (ID: " + s.getId() + ", isActive: " + s.isActive() + ")"));
            return ResponseEntity.ok(Map.of(
                "totalCount", allServices.size(),
                "services", allServices
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch services: " + e.getMessage()));
        }
    }

    /**
     * Request a custom service for the salon
     */
    @PostMapping("/request-custom")
    public ResponseEntity<?> requestCustomService(@RequestBody Map<String, String> request) {
        try {
            Long salonId = Long.parseLong(request.get("salonId"));
            String serviceName = request.get("serviceName");
            String description = request.get("description");

            if (serviceName == null || serviceName.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Service name is required"));
            }

            ServiceRequest serviceRequest = new ServiceRequest(salonId, serviceName, description);
            serviceRequestRepository.save(serviceRequest);

            // Create admin notification
            AdminNotification notification = new AdminNotification(
                salonId,
                "New service request: " + serviceName,
                "SERVICE_REQUEST"
            );
            notification.setRelatedId(serviceRequest.getId());
            adminNotificationRepository.save(notification);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Your service request has been submitted. Admin will review and add your service soon.",
                "requestId", serviceRequest.getId(),
                "status", "PENDING"
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid salon ID"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to submit service request: " + e.getMessage()));
        }
    }

    /**
     * Get service requests for a salon
     */
    @GetMapping("/requests/{salonId}")
    public ResponseEntity<?> getSalonServiceRequests(@PathVariable Long salonId) {
        try {
            List<ServiceRequest> requests = serviceRequestRepository.findBySalonIdOrderByRequestedAtDesc(salonId);
            return ResponseEntity.ok(Map.of("requests", requests));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch service requests: " + e.getMessage()));
        }
    }

    /**
     * Add a service as available to a salon with pricing
     */
    @PostMapping("/add-available-service")
    public ResponseEntity<?> addAvailableServiceWithPrice(@RequestBody Map<String, Object> request) {
        try {
            Long salonId = Long.parseLong(request.get("salonId").toString());
            Long serviceId = Long.parseLong(request.get("serviceId").toString());
            Double price = Double.parseDouble(request.get("price").toString());

            // Check if service already exists for this salon
            if (servicePriceRepository.findBySalonIdAndServiceId(salonId, serviceId).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "This service is already available for your salon"));
            }

            // Create and save pricing entry
            ServicePrice servicePrice = new ServicePrice(salonId, serviceId, price);
            servicePriceRepository.save(servicePrice);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Service has been added as available with pricing",
                "salonId", salonId,
                "serviceId", serviceId,
                "price", price
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid input format"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to add service: " + e.getMessage()));
        }
    }

    /**
     * Get services with pricing for a specific salon
     */
    @GetMapping("/with-prices/{salonId}")
    public ResponseEntity<?> getServicesWithPrices(@PathVariable Long salonId) {
        try {
            // Get all pricing entries for this salon
            List<ServicePrice> pricingEntries = servicePriceRepository.findBySalonId(salonId);
            
            if (pricingEntries.isEmpty()) {
                return ResponseEntity.ok(Map.of("message", "No services with pricing yet", "services", List.of()));
            }

            // Convert to a readable format with service details
            List<Map<String, Object>> servicesWithPrices = pricingEntries.stream().map(pricing -> {
                ServiceItem service = serviceItemRepository
                    .findById(Objects.requireNonNull(pricing.getServiceId(), "serviceId must not be null"))
                    .orElse(null);
                Map<String, Object> serviceData = new java.util.LinkedHashMap<>();
                serviceData.put("serviceId", pricing.getServiceId());
                serviceData.put("serviceName", service != null ? service.getName() : "Unknown Service");
                serviceData.put("price", pricing.getPrice());
                serviceData.put("pricingId", pricing.getId());
                return serviceData;
            }).toList();

            return ResponseEntity.ok(Map.of("services", servicesWithPrices));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch services with prices: " + e.getMessage()));
        }
    }
}
