package com.starc.snipme.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@DiscriminatorValue("SALON_OWNER")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class SalonOwner extends User {
    
    private String salonName;
    private String salonAddress;
    private String phoneNumber;
    
    public SalonOwner(Long id, String username, String email, String password, UserRole role,
                     String salonName, String salonAddress, String phoneNumber) {
        super(id, username, email, password, role);
        this.salonName = salonName;
        this.salonAddress = salonAddress;
        this.phoneNumber = phoneNumber;
    }
}
