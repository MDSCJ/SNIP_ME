package com.starc.snipme.security;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Simple in-memory fixed-window limiter for login / register / forgot-password,
 * to slow down password guessing and account-reset abuse.
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Logger audit = LoggerFactory.getLogger("AUDIT");

    private static final Set<String> LIMITED_PATHS = Set.of(
            "/api/auth/login", "/api/auth/register", "/api/auth/forgot-password");
    private static final int MAX_REQUESTS_PER_WINDOW = 10;
    private static final long WINDOW_MILLIS = 5 * 60 * 1000L;

    private final Map<String, long[]> windows = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !LIMITED_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        String ip = ClientIp.resolve(request);
        String key = request.getRequestURI() + "|" + ip;
        long now = System.currentTimeMillis();

        if (windows.size() > 50_000) {
            windows.entrySet().removeIf(e -> now - e.getValue()[0] > WINDOW_MILLIS);
        }

        long[] window = windows.compute(key, (k, w) -> {
            if (w == null || now - w[0] > WINDOW_MILLIS) {
                return new long[] { now, 1 };
            }
            w[1]++;
            return w;
        });

        if (window[1] > MAX_REQUESTS_PER_WINDOW) {
            audit.warn("RATE_LIMITED ip={} uri={} count={}", ip, request.getRequestURI(), window[1]);
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many attempts. Please wait a few minutes and try again.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
