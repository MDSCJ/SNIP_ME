package com.starc.snipme.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/payment")
public class PaymentController {

    // ── PayHere Sandbox Credentials ───────────────────────────
    private static final String MERCHANT_ID = "1235274";

    // Secret for localhost (your existing one)
    private static final String SECRET_LOCALHOST =
        "Mjg2ODM5NDc3OTU4ODM2Njg4NTM5NDc2MDU0MDk3NzI1NTE4MDg=";

    // Secret for mdscj.github.io

    private static final String SECRET_GITHUB =
        "MjczNjUwNTQzOTUxNjQzNTIxMTY1NzMyODMzNDE4NjQ2MDE1NA=";

    // ── GET /api/payment/hash ─────────────────────────────────
    // Called by booking.js — detects which domain the request
    // came from and uses the correct merchant secret
    @GetMapping("/hash")
    public ResponseEntity<Map<String, String>> generateHash(
            @RequestParam String orderId,
            @RequestParam String amount,
            @RequestParam(defaultValue = "LKR") String currency,
            HttpServletRequest request) {

        try {
            // Detect which frontend is calling us
            String origin = request.getHeader("Origin");
            String referer = request.getHeader("Referer");
            String source = (origin != null ? origin : "") + (referer != null ? referer : "");

            // Pick the correct secret based on domain
            String secret;
            if (source.contains("github.io")) {
                secret = SECRET_GITHUB;
            } else {
                // localhost, 127.0.0.1, or any other local dev
                secret = SECRET_LOCALHOST;
            }

            // Generate hash: MD5(merchant_id + order_id + amount + currency + MD5(secret).toUpperCase())
            String hashedSecret = md5(secret).toUpperCase();
            String rawString    = MERCHANT_ID + orderId + amount + currency + hashedSecret;
            String hash         = md5(rawString).toUpperCase();

            Map<String, String> response = new HashMap<>();
            response.put("merchant_id", MERCHANT_ID);
            response.put("order_id",    orderId);
            response.put("amount",      amount);
            response.put("currency",    currency);
            response.put("hash",        hash);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Hash generation error: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── POST /api/payment/notify ──────────────────────────────
    // PayHere calls this after payment is processed
    @PostMapping("/notify")
    public ResponseEntity<String> paymentNotify(
            @RequestParam(required = false) String merchant_id,
            @RequestParam(required = false) String order_id,
            @RequestParam(required = false) String payment_id,
            @RequestParam(required = false) String payhere_amount,
            @RequestParam(required = false) String payhere_currency,
            @RequestParam(required = false) String status_code,
            @RequestParam(required = false) String md5sig) {

        System.out.println("=== PayHere Notify ===");
        System.out.println("Order ID   : " + order_id);
        System.out.println("Payment ID : " + payment_id);
        System.out.println("Status     : " + status_code);
        System.out.println("Amount     : " + payhere_amount);
        System.out.println("======================");

        return ResponseEntity.ok("OK");
    }

    // ── MD5 helper ────────────────────────────────────────────
    private String md5(String input) throws Exception {
        MessageDigest md  = MessageDigest.getInstance("MD5");
        byte[] digest     = md.digest(input.getBytes(StandardCharsets.UTF_8));
        BigInteger number = new BigInteger(1, digest);
        String hash       = number.toString(16);
        while (hash.length() < 32) hash = "0" + hash;
        return hash;
    }
}