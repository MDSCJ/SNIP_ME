package com.starc.snipme.dto;

public class AuthRequest {
    private String email;
    private String password;
    private String name;
    private String phoneNumber;
    private String role; // "CUSTOMER", "SALON_OWNER", or "ADMIN"
    
    // Missing fields that were causing the red errors in AuthController:
    private String salonName;
    private String salonAddress; 
    private Integer accessLevel;

    // Required by Jackson for JSON deserialization.
    public AuthRequest() {
        // Intentionally empty.
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getSalonName() {
        return salonName;
    }

    public void setSalonName(String salonName) {
        this.salonName = salonName;
    }

    public String getSalonAddress() {
        return salonAddress;
    }

    public void setSalonAddress(String salonAddress) {
        this.salonAddress = salonAddress;
    }

    public Integer getAccessLevel() {
        return accessLevel;
    }

    public void setAccessLevel(Integer accessLevel) {
        this.accessLevel = accessLevel;
    }
}