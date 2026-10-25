package com.starc.snipme.security;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Writes one AUDIT log line per security-relevant API request (who, from which
 * IP, what, result) so incidents can be traced from the Render logs.
 * High-frequency anonymous polling GETs that succeed are skipped to keep noise down.
 */
@Component
public class RequestAuditFilter extends OncePerRequestFilter {

    private static final Logger audit = LoggerFactory.getLogger("AUDIT");

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            String uri = request.getRequestURI();
            int status = response.getStatus();
            boolean sensitive = uri.startsWith("/api/admin") || uri.startsWith("/api/auth")
                    || uri.startsWith("/api/payment") || uri.startsWith("/api/salon-owner");
            boolean mutating = !"GET".equals(request.getMethod()) && !"OPTIONS".equals(request.getMethod());

            if (sensitive || mutating || status >= 400) {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                String principal = (auth == null || auth.getName() == null) ? "-" : auth.getName();
                String query = request.getQueryString();
                audit.info("ip={} xff=\"{}\" method={} uri={}{} status={} user={} ua=\"{}\" ms={}",
                        ClientIp.resolve(request),
                        nullToDash(request.getHeader("X-Forwarded-For")),
                        request.getMethod(),
                        uri,
                        query == null ? "" : "?" + query,
                        status,
                        principal,
                        nullToDash(request.getHeader("User-Agent")),
                        System.currentTimeMillis() - start);
            }
        }
    }

    private static String nullToDash(String value) {
        return value == null ? "-" : value.replace("\"", "'");
    }
}
