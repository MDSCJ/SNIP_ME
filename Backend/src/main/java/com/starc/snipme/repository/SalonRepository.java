package com.starc.snipme.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.Salon;

@Repository
public interface SalonRepository extends JpaRepository<Salon, Long> {
	Optional<Salon> findByOwnerUserId(Long ownerUserId);
	Optional<Salon> findByEmailIgnoreCase(String email);
	
	@Query("SELECT s FROM Salon s WHERE s.isActive = true ORDER BY s.rate DESC LIMIT 10")
	List<Salon> findTrendingSalons();
	
	// Search salons by location and distance
	@Query("SELECT s FROM Salon s WHERE s.isActive = true AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL")
	List<Salon> findAllActiveSalonsWithLocation();
	
	// Get all active salons regardless of coordinates
	@Query("SELECT s FROM Salon s WHERE s.isActive = true ORDER BY s.rate DESC")
	List<Salon> findByIsActiveTrueOrderByRateDesc();
}
