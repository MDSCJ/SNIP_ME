package com.starc.snipme.security;

import jakarta.servlet.http.HttpServletRequest;

/** Best-effort client IP extraction behind Render / Cloudflare proxies. */
public final class ClientIp {

    private ClientIp() {
    }

    public static String resolve(HttpServletRequest request) {
        String[] headers = { "CF-Connecting-IP", "True-Client-IP", "X-Real-IP" };
        for (String header : headers) {
            String value = request.getHeader(header);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
