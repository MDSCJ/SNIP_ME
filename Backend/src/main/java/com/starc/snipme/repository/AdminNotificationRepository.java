package com.starc.snipme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import com.starc.snipme.model.AdminNotification;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {
    
    // Get all unread notifications
    List<AdminNotification> findByIsReadFalseOrderByCreatedAtDesc();
    
    // Get all notifications (read and unread)
    List<AdminNotification> findAllByOrderByCreatedAtDesc();
    
    // Get unread notification count
    long countByIsReadFalse();
    
    // Delete notifications older than given date
    @Modifying
    @Transactional
    @Query("DELETE FROM AdminNotification a WHERE a.createdAt < :cutoffDate")
    int deleteOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    // Get notifications by salon ID
    List<AdminNotification> findBySalonIdOrderByCreatedAtDesc(Long salonId);
    
    // Get unread notifications for a specific salon
    List<AdminNotification> findBySalonIdAndIsReadFalseOrderByCreatedAtDesc(Long salonId);
}
