package com.starc.snipme.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.Salon;

@Repository
public interface SalonRepository extends JpaRepository<Salon, Long> {

	//good to keep
	Optional<Salon> findByOwnerUserId(Long ownerUserId);
	Optional<Salon> findByEmailIgnoreCase(String email);
	
	// FIX: Using Spring's naming convention instead of the broken JPQL "LIMIT 10"
	//@Query("SELECT s FROM Salon s WHERE s.isActive = true ORDER BY s.rate DESC LIMIT 10")
	//List<Salon> findTrendingSalons();
	List<Salon> findTop10ByIsActiveTrueOrderByRateDesc();
	
	// Search salons by location and distance
	// @Query("SELECT s FROM Salon s WHERE s.isActive = true AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL")
	// List<Salon> findAllActiveSalonsWithLocation();
	
	
	// Get all active salons regardless of coordinates
	//@Query("SELECT s FROM Salon s WHERE s.isActive = true ORDER BY s.rate DESC")
	List<Salon> findByIsActiveTrueOrderByRateDesc();

	// --- ENTERPRISE GEOLOCATION (RESTORED) ---
    // Search salons by location and distance (Calculated in the Database, NOT in Java!)
    @Query(value = "SELECT * FROM salons s WHERE s.is_active = true AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND " +
           "(6371 * acos(cos(radians(:userLat)) * cos(radians(s.latitude)) * " +
           "cos(radians(s.longitude) - radians(:userLon)) + " +
           "sin(radians(:userLat)) * sin(radians(s.latitude)))) < :radius " +
           "ORDER BY " +
           "(6371 * acos(cos(radians(:userLat)) * cos(radians(s.latitude)) * " +
           "cos(radians(s.longitude) - radians(:userLon)) + " +
           "sin(radians(:userLat)) * sin(radians(s.latitude)))) ASC", 
           nativeQuery = true)
    List<Salon> findNearbySalons(@Param("userLat") Double userLat, 
                                 @Param("userLon") Double userLon, 
                                 @Param("radius") Double radius);
}


/*

*/