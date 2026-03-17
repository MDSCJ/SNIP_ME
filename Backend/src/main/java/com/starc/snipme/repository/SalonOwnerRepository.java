package com.starc.snipme.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.SalonOwner;

@Repository
public interface SalonOwnerRepository extends JpaRepository<SalonOwner, Long> {
    // Helpful for searching salons specifically
    Optional<SalonOwner> findBySalonName(String salonName);
}