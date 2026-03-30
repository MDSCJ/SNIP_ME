package com.starc.snipme.model;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "salons")

public class Salon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long salonID;

    @Column(nullable = false)
    private String name;

    private String address;
    private String city;
    private String phoneNumber;
    private String email;

    private LocalTime openingTime;
    private LocalTime closingTime;

    // Add these for GPS tracking
    private Double latitude;
    private Double longitude;

    
    

    private boolean isActive = true;

    // Default constructor
    public Salon() {}

    // Getters and Setters
    public Long getSalonID() { return salonID; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

}
