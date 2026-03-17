package com.starc.snipme.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@DiscriminatorValue("CUSTOMER")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Customer extends User {
    
    private String name;
    
    public Customer(Long id, String email, String password, UserRole role, String name) {
        super(id, email, password, role);
        this.name = name;
    }
}
