package com.starc.snipme.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.ServiceRequest;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    List<ServiceRequest> findBySalonIdOrderByRequestedAtDesc(Long salonId);
    List<ServiceRequest> findByStatusOrderByRequestedAtDesc(String status);
    Optional<ServiceRequest> findByIdAndSalonId(Long id, Long salonId);
}
