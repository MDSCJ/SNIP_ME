package com.starc.snipme.controller;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.starc.snipme.model.Salon;
import com.starc.snipme.model.ServiceItem;
import com.starc.snipme.model.ServicePrice;
import com.starc.snipme.repository.SalonRepository;
import com.starc.snipme.repository.ServiceItemRepository;
import com.starc.snipme.repository.ServicePriceRepository;

@RestController
@RequestMapping("/api/public/salons")
public class PublicSalonController {

    
    private final SalonRepository salonRepository;

    // ── NEW: two repos for booking page ──────────────────
    @Autowired
    private ServiceItemRepository serviceItemRepository;

    @Autowired
    private ServicePriceRepository servicePriceRepository;

    // ── existing constructor (NOT CHANGED) ───────────────
    public PublicSalonController(SalonRepository salonRepository) {
        this.salonRepository = salonRepository;
    }

    
    @GetMapping("/trending")
    public ResponseEntity<?> getTrendingSalons() {
        try {
            List<Salon> trendingSalons = salonRepository.findTop10ByIsActiveTrueOrderByRateDesc();

            List<Map<String, Object>> salonDTOs = new ArrayList<>();
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("h:mm a");

            for (Salon salon : trendingSalons) {
                Map<String, Object> salonMap = Map.ofEntries(
                    Map.entry("id", salon.getSalonID()),
                    Map.entry("name", salon.getName()),
                    Map.entry("description", salon.getDetails() != null ? salon.getDetails() : ""),
                    Map.entry("photo", salon.getPhotoLowQuality() != null ? salon.getPhotoLowQuality() : ""),
                    Map.entry("address", salon.getAddress() != null ? salon.getAddress() : ""),
                    Map.entry("city", salon.getCity() != null ? salon.getCity() : ""),
                    Map.entry("rating", salon.getRate()),
                    Map.entry("numberOfRatings", salon.getNOfRatings()),
                    Map.entry("openingTime", salon.getOpeningTime() != null ? salon.getOpeningTime().format(timeFormatter) : ""),
                    Map.entry("closingTime", salon.getClosingTime() != null ? salon.getClosingTime().format(timeFormatter) : "")
                );
                salonDTOs.add(salonMap);
            }

            return ResponseEntity.ok(salonDTOs);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", "Failed to fetch trending salons",
                "message", e.getMessage()
            ));
        }
    }


    @GetMapping("/search")
    public ResponseEntity<?> searchSalons(
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(defaultValue = "5") Double radiusKm,
            @RequestParam(required = false) String treatment,
            @RequestParam(required = false) String location,
            @RequestParam(defaultValue = "rating") String sortBy,
            @RequestParam(defaultValue = "0") int page) {
        try {
            List<Salon> allSalons = salonRepository.findByIsActiveTrueOrderByRateDesc();
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("h:mm a");
            String normalizedTreatment = treatment == null ? "" : treatment.trim();
            String normalizedLocation = location == null ? "" : location.trim();

            Optional<ServiceItem> treatmentService = normalizedTreatment.isBlank()
                ? Optional.empty()
                : serviceItemRepository.findByNameIgnoreCase(normalizedTreatment);

            Set<Long> treatmentSalonIds = treatmentService
                .map(service -> servicePriceRepository.findByServiceId(service.getId()).stream()
                    .map(ServicePrice::getSalonId)
                    .collect(Collectors.toSet()))
                .orElse(Set.of());

            List<Salon> filteredSalons = allSalons;
            filteredSalons = filteredSalons.stream()
                .filter(salon -> matchesTreatmentFilter(salon, normalizedTreatment, treatmentService, treatmentSalonIds))
                .filter(salon -> matchesLocationFilter(salon, normalizedLocation))
                .filter(salon -> matchesDistanceFilter(salon, latitude, longitude, radiusKm))
                .collect(Collectors.toList());

            if ("price".equalsIgnoreCase(sortBy)) {
                filteredSalons.sort(Comparator.comparingDouble(s -> getAverageSalonPrice(s)));
            } else {
                filteredSalons.sort((s1, s2) -> Double.compare(s2.getRate(), s1.getRate()));
            }

            int pageSize = 10;
            int startIdx = page * pageSize;
            int endIdx   = Math.min(startIdx + pageSize, filteredSalons.size());

            List<Salon> paginatedSalons = filteredSalons.subList(startIdx, endIdx);

            List<Map<String, Object>> salonDTOs = new ArrayList<>();
            for (Salon salon : paginatedSalons) {
                Double distance = null;
                if (salon.getLatitude() != null && salon.getLongitude() != null
                        && latitude != null && longitude != null) {
                    distance = calculateDistance(latitude, longitude,
                                                 salon.getLatitude(), salon.getLongitude());
                }

                Map<String, Object> salonMap = Map.ofEntries(
                    Map.entry("id", salon.getSalonID()),
                    Map.entry("name", salon.getName()),
                    Map.entry("description", salon.getDetails() != null ? salon.getDetails() : ""),
                    Map.entry("photo", salon.getPhotoLowQuality() != null ? salon.getPhotoLowQuality() : ""),
                    Map.entry("address", salon.getAddress() != null ? salon.getAddress() : ""),
                    Map.entry("city", salon.getCity() != null ? salon.getCity() : ""),
                    Map.entry("rating", salon.getRate()),
                    Map.entry("numberOfRatings", salon.getNOfRatings()),
                    Map.entry("openingTime", salon.getOpeningTime() != null ? salon.getOpeningTime().format(timeFormatter) : ""),
                    Map.entry("closingTime", salon.getClosingTime() != null ? salon.getClosingTime().format(timeFormatter) : ""),
                    Map.entry("latitude", salon.getLatitude()),
                    Map.entry("longitude", salon.getLongitude()),
                    Map.entry("distance", distance)
                );
                salonDTOs.add(salonMap);
            }

            return ResponseEntity.ok(Map.of(
                "salons", salonDTOs,
                "totalCount", filteredSalons.size(),
                "hasMore", endIdx < filteredSalons.size(),
                "currentPage", page
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", "Failed to search salons",
                "message", e.getMessage()
            ));
        }
    }

    
    private double calculateDistance(double lat1, double lon1, Double lat2, Double lon2) {
        if (lat2 == null || lon2 == null) return Double.MAX_VALUE;
        double latDiff = lat2 - lat1;
        double lonDiff = lon2 - lon1;
        double avgLat  = (lat1 + lat2) / 2.0;
        double latKm   = latDiff * 111.0;
        double lonKm   = lonDiff * 111.0 * Math.cos(Math.toRadians(avgLat));
        return Math.sqrt(latKm * latKm + lonKm * lonKm);
    }

    private double getAverageSalonPrice(Salon salon) {
        return 0.0;
    }

    private boolean matchesTreatmentFilter(Salon salon,
                                           String treatment,
                                           Optional<ServiceItem> treatmentService,
                                           Set<Long> treatmentSalonIds) {
        if (treatment == null || treatment.isBlank()) {
            return true;
        }

        if (treatmentService.isPresent()) {
            Long salonId = salon.getSalonID();
            return salonId != null && treatmentSalonIds.contains(salonId);
        }

        return containsIgnoreCase(salon.getName(), treatment)
                || containsIgnoreCase(salon.getDetails(), treatment)
                || containsIgnoreCase(salon.getAddress(), treatment)
                || containsIgnoreCase(salon.getCity(), treatment);
    }

    private boolean matchesLocationFilter(Salon salon, String location) {
        if (location == null || location.isBlank()) {
            return true;
        }

        return containsIgnoreCase(salon.getName(), location)
                || containsIgnoreCase(salon.getDetails(), location)
                || containsIgnoreCase(salon.getAddress(), location)
                || containsIgnoreCase(salon.getCity(), location)
                || containsIgnoreCase(salon.getEmail(), location)
                || containsIgnoreCase(salon.getPhoneNumber(), location);
    }

    private boolean matchesDistanceFilter(Salon salon,
                                          Double latitude,
                                          Double longitude,
                                          Double radiusKm) {
        if (latitude == null || longitude == null) {
            return true;
        }

        if (salon.getLatitude() != null && salon.getLongitude() != null) {
            double distance = calculateDistance(latitude, longitude,
                                               salon.getLatitude(),
                                               salon.getLongitude());
            return distance <= radiusKm;
        }

        return salon.getCity() != null && !salon.getCity().isBlank();
    }

    private boolean containsIgnoreCase(String value, String query) {
        return value != null && query != null && value.toLowerCase().contains(query.toLowerCase());
    }

    // ════════════════════════════════════════════════════
    // NEW — GET /api/public/salons/{id}
    // Booking page uses this to load salon name + description
    // ════════════════════════════════════════════════════
    @GetMapping("/{id}")
    public ResponseEntity<?> getSalonById(@PathVariable Long id) {
        return salonRepository.findById(id)
            .map(salon -> {
                Map<String, Object> res = new HashMap<>();
                res.put("salonID",     salon.getSalonID());
                res.put("name",        salon.getName());
                res.put("details",     salon.getDetails() != null ? salon.getDetails() : "Professional salon services");
                res.put("address",     salon.getAddress()     != null ? salon.getAddress()     : "");
                res.put("city",        salon.getCity()        != null ? salon.getCity()        : "");
                res.put("phoneNumber", salon.getPhoneNumber() != null ? salon.getPhoneNumber() : "");
                res.put("email",       salon.getEmail()       != null ? salon.getEmail()       : "");
                res.put("rate",        salon.getRate());
                res.put("openingTime", salon.getOpeningTime() != null ? salon.getOpeningTime().toString() : "");
                res.put("closingTime", salon.getClosingTime() != null ? salon.getClosingTime().toString() : "");
                res.put("holidays",    salon.getHolidays()    != null ? salon.getHolidays()    : "[]");
                return ResponseEntity.ok((Object) res);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ════════════════════════════════════════════════════
    // NEW — GET /api/public/salons/{id}/services
    // Booking page uses this to populate the services dropdown
    // with real service names and prices from the database
    // ════════════════════════════════════════════════════
    @GetMapping("/{id}/services")
    public ResponseEntity<?> getSalonServices(@PathVariable Long id) {
        List<ServicePrice> prices = servicePriceRepository.findBySalonId(id);
        List<Map<String, Object>> result = new ArrayList<>();
        for (ServicePrice sp : prices) {
            serviceItemRepository.findById(sp.getServiceId()).ifPresent(service -> {
                if (service.isActive()) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("serviceId",   service.getId());
                    item.put("serviceName", service.getName());
                    item.put("price",       sp.getPrice());
                    result.add(item);
                }
            });
        }
        return ResponseEntity.ok(result);
    }
}