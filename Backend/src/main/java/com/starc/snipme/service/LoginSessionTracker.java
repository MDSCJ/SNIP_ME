package com.starc.snipme.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class LoginSessionTracker {

    private static class SessionInfo {
        private final String role;
        private Instant lastSeen;

        private SessionInfo(String role, Instant lastSeen) {
            this.role = role;
            this.lastSeen = lastSeen;
        }
    }

    private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();
    private final Duration sessionTtl = Duration.ofHours(24);

    public void markLogin(String email, String role) {
        purgeExpired();
        sessions.put(email.toLowerCase(), new SessionInfo(role == null ? "CUSTOMER" : role.toUpperCase(), Instant.now()));
    }

    public int countLoggedInUsers() {
        purgeExpired();
        return sessions.size();
    }

    public int countLoggedInSalonOwners() {
        purgeExpired();
        int count = 0;
        for (SessionInfo session : sessions.values()) {
            if ("SALON_OWNER".equals(session.role)) {
                count++;
            }
        }
        return count;
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        sessions.entrySet().removeIf(entry -> now.isAfter(entry.getValue().lastSeen.plus(sessionTtl)));
    }
}
