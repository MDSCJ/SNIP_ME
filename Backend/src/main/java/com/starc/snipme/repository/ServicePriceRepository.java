package com.starc.snipme.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.ServicePrice;

@Repository
public interface ServicePriceRepository extends JpaRepository<ServicePrice, Long> {
    List<ServicePrice> findBySalonId(Long salonId);
    Optional<ServicePrice> findBySalonIdAndServiceId(Long salonId, Long serviceId);
    List<ServicePrice> findByServiceId(Long serviceId);
}
