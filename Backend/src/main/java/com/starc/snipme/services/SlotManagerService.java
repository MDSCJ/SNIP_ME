package com.starc.snipme.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.starc.snipme.model.TimeSlot;
import com.starc.snipme.repositories.TimeSlotRepository;

@Service
public class SlotManagerService {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    // This runs automatically every 60,000 milliseconds (1 minute)
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void releaseExpiredLocks() {
        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        
        // Find all slots that are "LOCKED" and where lockedAt is older than 5 minutes ago
        // (You would need to add a standard findByStatusAndLockedAtBefore method to your repository)
        List<TimeSlot> expiredSlots = timeSlotRepository.findExpiredLocks("LOCKED", fiveMinutesAgo);

        for (TimeSlot slot : expiredSlots) {
            slot.setStatus("AVAILABLE");
            slot.setLockedAt(null);
            timeSlotRepository.save(slot);
            System.out.println("Released expired lock for Slot ID: " + slot.getSlotID());
        }
    }
}