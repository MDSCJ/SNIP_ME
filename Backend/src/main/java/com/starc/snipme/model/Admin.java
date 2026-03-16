package com.starc.snipme.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@DiscriminatorValue("ADMIN")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Admin extends User {
    
    private Integer accessLevel;
    
    public Admin(Long id, String username, String email, String password, UserRole role, Integer accessLevel) {
        super(id, username, email, password, role);
        this.accessLevel = accessLevel;
    }
}
