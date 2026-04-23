package com.starc.snipme.controller;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.starc.snipme.model.ServiceItem;
import com.starc.snipme.repository.ServiceItemRepository;

@RestController
@RequestMapping("/api/public/services")
public class PublicServiceController {

    private final ServiceItemRepository serviceItemRepository;

    public PublicServiceController(ServiceItemRepository serviceItemRepository) {
        this.serviceItemRepository = serviceItemRepository;
    }

    @GetMapping("/search-options")
    public ResponseEntity<?> getSearchOptions() {
        List<ServiceItem> services = serviceItemRepository.findByIsActiveTrueAndIncludeInSearchTrueOrderByNameAsc();

        Set<String> options = new LinkedHashSet<>();
        for (ServiceItem service : services) {
            if (service.getName() != null && !service.getName().isBlank()) {
                options.add(service.getName().trim());
            }
        }

        if (options.isEmpty()) {
            options.add("School cut - boys");
            options.add("School cut - girls");
        }

        return ResponseEntity.ok(options);
    }
}
