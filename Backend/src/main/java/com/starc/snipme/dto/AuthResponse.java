package com.starc.snipme.dto;

public class AuthResponse {
    private String token;
    private String name;
    private String phoneNumber;
    private String email;

    public AuthResponse(String token) {
        this.token = token;
    }

    public AuthResponse(String token, String name, String phoneNumber, String email) {
        this.token = token;
        this.name = name;
        this.phoneNumber = phoneNumber;
        this.email = email;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

}
