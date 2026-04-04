package com.starc.snipme.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.Salon;

@Repository
public interface SalonRepository extends JpaRepository<Salon, Long> {
	Optional<Salon> findByOwnerUserId(Long ownerUserId);
	Optional<Salon> findByEmailIgnoreCase(String email);
}
