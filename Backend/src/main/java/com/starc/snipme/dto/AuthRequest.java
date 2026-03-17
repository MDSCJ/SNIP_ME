package com.starc.snipme.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
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
}