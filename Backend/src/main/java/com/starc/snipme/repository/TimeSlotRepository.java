package com.starc.snipme.repository;

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

    // 3. Availability logic based only on time_slots table.
    @Query("""
            SELECT t
            FROM TimeSlot t
            WHERE t.salon.salonID = :salonId
                AND t.startTime >= :fromTime
                AND t.startTime < :toTime
                AND t.status = 'AVAILABLE'
            ORDER BY t.startTime ASC
            """)
    List<TimeSlot> findMergedAvailableSlotsBySalonAndDate(
                    @Param("salonId") Long salonId,
                    @Param("fromTime") LocalDateTime fromTime,
                    @Param("toTime") LocalDateTime toTime);

    // 4. Concurrency guard for virtual slots: PESSIMISTIC_WRITE lock to detect
    //    a concurrent booking at the same salon + startTime (BOOKED or LOCKED)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TimeSlot t WHERE t.salon.salonID = :salonId AND t.startTime = :startTime AND t.status IN ('BOOKED','LOCKED')")
    Optional<TimeSlot> findConflictingSlot(@Param("salonId") Long salonId,
                                           @Param("startTime") LocalDateTime startTime);

    // 5. Real-time polling: return all BOOKED or LOCKED slots for a salon on a date range
    @Query("SELECT t FROM TimeSlot t WHERE t.salon.salonID = :salonId AND t.startTime >= :fromTime AND t.startTime < :toTime AND t.status IN ('BOOKED','LOCKED')")
    List<TimeSlot> findUnavailableSlotsBySalonAndDateRange(@Param("salonId") Long salonId,
                                                           @Param("fromTime") LocalDateTime fromTime,
                                                           @Param("toTime") LocalDateTime toTime);
}