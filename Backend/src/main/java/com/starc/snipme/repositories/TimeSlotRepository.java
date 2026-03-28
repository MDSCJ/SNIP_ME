package com.starc.snipme.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

//import javax.swing.Spring;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.starc.snipme.model.TimeSlot;

import jakarta.persistence.LockModeType;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {
    //Spring Boot will automatically write the SQL for this based on the method name!
    List<TimeSlot> findByStatus(String status);

    // 1. The Pessimistic Lock for Concurrency
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TimeSlot t WHERE t.slotID = :slotID AND t.status = 'AVAILABLE'")
    Optional<TimeSlot> lockSlotForBooking(@Param("slotID") Long slotID);

    // 2. The Sweeper Query for Timeout Logic (This fixes your error!)
    @Query("SELECT t FROM TimeSlot t WHERE t.status = :status AND t.lockedAt < :timeLimit")
    List<TimeSlot> findExpiredLocks(@Param("status") String status, @Param("timeLimit") LocalDateTime timeLimit);
}