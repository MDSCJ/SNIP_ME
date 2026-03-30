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

    private String details;
    private String address;
    private String city;
    private String phoneNumber;
    private String email;

    private LocalTime openingTime;
    private LocalTime closingTime;

    // Add these for GPS tracking
    private Double latitude;
    private Double longitude;

    @Column(name = "n_of_ratings", nullable = false)
    private int nOfRatings = 0;

    @Column(name = "rate", nullable = false)
    private double rate = 0.0;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    // Default constructor
    public Salon() {}

    // Getters and Setters
    public Long getSalonID() { return salonID; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public LocalTime getOpeningTime() { return openingTime; }
    public void setOpeningTime(LocalTime openingTime) { this.openingTime = openingTime; }
    public LocalTime getClosingTime() { return closingTime; }
    public void setClosingTime(LocalTime closingTime) { this.closingTime = closingTime; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public int getNOfRatings() { return nOfRatings; }
    public void setNOfRatings(int nOfRatings) { this.nOfRatings = nOfRatings; }

    public double getRate() { return rate; }
    public void setRate(double rate) { this.rate = rate; }

    // Updates average rating: ((currentAverage * n) + newRate) / (n + 1)
    public void addRating(double newRate) {
        double boundedRate = Math.max(0.0, Math.min(5.0, newRate));
        this.rate = ((this.rate * this.nOfRatings) + boundedRate) / (this.nOfRatings + 1);
        this.nOfRatings = this.nOfRatings + 1;
    }

}
