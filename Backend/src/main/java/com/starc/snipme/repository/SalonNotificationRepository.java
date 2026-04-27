package com.starc.snipme.repository;

import com.starc.snipme.model.SalonNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SalonNotificationRepository extends JpaRepository<SalonNotification, Long> {
    
    List<SalonNotification> findBySalonIdOrderByCreatedAtDesc(Long salonId);
    
    List<SalonNotification> findBySalonIdAndIsReadFalseOrderByCreatedAtDesc(Long salonId);
    
    long countBySalonIdAndIsReadFalse(Long salonId);
    
    List<SalonNotification> findBySalonIdAndTypeOrderByCreatedAtDesc(Long salonId, String type);
}