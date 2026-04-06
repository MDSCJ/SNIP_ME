package com.starc.snipme.controller;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
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
}
