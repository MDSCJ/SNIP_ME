package com.starc.snipme.controller;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.starc.snipme.model.Salon;
import com.starc.snipme.repository.SalonRepository;

@RestController
@RequestMapping("/api/public/salons")
public class PublicSalonController {

    private final SalonRepository salonRepository;

    public PublicSalonController(SalonRepository salonRepository) {
        this.salonRepository = salonRepository;
    }

    @GetMapping("/trending")
    public ResponseEntity<?> getTrendingSalons() {
        try {
            List<Salon> trendingSalons = salonRepository.findTrendingSalons();
            
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
            @RequestParam(defaultValue = "rating") String sortBy,
            @RequestParam(defaultValue = "0") int page) {
        try {
            // Get all active salons (with and without coordinates)
            List<Salon> allSalons = salonRepository.findByIsActiveTrueOrderByRateDesc();
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("h:mm a");
            
            // Filter by distance if user location is provided
            List<Salon> filteredSalons = allSalons;
            if (latitude != null && longitude != null) {
                filteredSalons = allSalons.stream()
                    .filter(salon -> {
                        // If salon has coordinates, check distance
                        if (salon.getLatitude() != null && salon.getLongitude() != null) {
                            double distance = calculateDistance(latitude, longitude, 
                                                              salon.getLatitude(), 
                                                              salon.getLongitude());
                            return distance <= radiusKm;
                        }
                        // If salon has no coordinates but has city, allow it (distance will be unknown)
                        return salon.getCity() != null && !salon.getCity().isEmpty();
                    })
                    .collect(Collectors.toList());
            }
            
            // Sort by specified criteria
            if ("price".equalsIgnoreCase(sortBy)) {
                filteredSalons.sort(Comparator.comparingDouble(s -> getAverageSalonPrice(s)));
            } else {
                // Default sort by rating (descending)
                filteredSalons.sort((s1, s2) -> Double.compare(s2.getRate(), s1.getRate()));
            }
            
            // Pagination: 10 results per page
            int pageSize = 10;
            int startIdx = page * pageSize;
            int endIdx = Math.min(startIdx + pageSize, filteredSalons.size());
            
            List<Salon> paginatedSalons = filteredSalons.subList(startIdx, endIdx);
            
            List<Map<String, Object>> salonDTOs = new ArrayList<>();
            for (Salon salon : paginatedSalons) {
                Double distance = null;
                if (salon.getLatitude() != null && salon.getLongitude() != null && latitude != null && longitude != null) {
                    distance = calculateDistance(latitude, longitude, salon.getLatitude(), salon.getLongitude());
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

    /**
     * Calculate distance between two coordinates using Pythagorean theorem approximation
     * Distance (km) = sqrt((lat2-lat1)^2 * 111^2 + (lon2-lon1)^2 * (111*cos(avg_lat))^2)
     */
    private double calculateDistance(double lat1, double lon1, Double lat2, Double lon2) {
        if (lat2 == null || lon2 == null) {
            return Double.MAX_VALUE;
        }
        
        double latDiff = lat2 - lat1;
        double lonDiff = lon2 - lon1;
        double avgLat = (lat1 + lat2) / 2.0;
        
        // Conversion factor: 1 degree latitude ≈ 111 km
        double latKm = latDiff * 111.0;
        // 1 degree longitude ≈ 111 * cos(latitude) km
        double lonKm = lonDiff * 111.0 * Math.cos(Math.toRadians(avgLat));
        
        // Pythagorean theorem: distance = sqrt(x^2 + y^2)
        return Math.sqrt(latKm * latKm + lonKm * lonKm);
    }
    
    /**
     * Helper method to get average salon service price (placeholder)
     * In a real application, this would aggregate service prices
     */
    private double getAverageSalonPrice(Salon salon) {
        // Placeholder: could integrate with ServicePrice table
        // For now, returning 0 as services need to be fetched separately
        return 0.0;
    }
}
