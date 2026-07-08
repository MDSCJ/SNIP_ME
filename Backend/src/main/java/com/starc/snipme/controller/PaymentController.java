package com.starc.snipme.controller;

import com.starc.snipme.model.Payment;
import com.starc.snipme.repository.PaymentRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentRepository paymentRepository;

    // ── PayHere Credentials (injected from application-secrets.properties) ───
    @Value("${payhere.merchant.id}")
    private String merchantId;

    @Value("${payhere.secret.localhost}")
    private String secretLocalhost;

    @Value("${payhere.secret.production}")
    private String secretProduction;

    public PaymentController(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

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

            // Log the detected origin for debugging
            System.out.println("Payment hash request — Origin: " + origin + " | Referer: " + referer);

            // Pick the correct secret based on domain
            // Only use localhost secret for actual local development
            String secret;
            if (source.contains("localhost") || source.contains("127.0.0.1")) {
                secret = secretLocalhost;
                System.out.println("Using LOCALHOST secret");
            } else {
                // All hosted frontends (github.io, onrender.com, custom domain, etc.)
                secret = secretProduction;
                System.out.println("Using PRODUCTION secret for: " + source);
            }

            // Generate hash: MD5(merchant_id + order_id + amount + currency +
            // MD5(secret).toUpperCase())
            String hashedSecret = md5(secret).toUpperCase();
            String rawString = merchantId + orderId + amount + currency + hashedSecret;
            String hash = md5(rawString).toUpperCase();

            Map<String, String> response = new HashMap<>();
            response.put("merchant_id", merchantId);
            response.put("order_id", orderId);
            response.put("amount", amount);
            response.put("currency", currency);
            response.put("hash", hash);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Hash generation error: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── POST /api/payment/notify ──────────────────────────────
    // PayHere server calls this webhook after payment is processed.
    // NOTE: The booking is already confirmed via onCompleted → confirmBookingInBackend()
    // before PayHere ever fires this notify (because Render free-tier wakes slowly).
    // This endpoint is therefore a safety net: it only updates the Payment row to
    // "Success" if it wasn't already saved by the client-side flow.
    @PostMapping("/notify")
    @Transactional
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

        // status_code "2" = success in PayHere API
        if (order_id != null && "2".equals(status_code)) {
            paymentRepository.findByOrderId(order_id).ifPresent(payment -> {
                // Only update if not already marked successful by the client-side flow
                if (!"Success".equalsIgnoreCase(payment.getPaymentStatus())) {
                    payment.setPaymentStatus("Success");
                    paymentRepository.save(payment);
                    System.out.println("Notify: Payment marked Success for order " + order_id);
                } else {
                    System.out.println("Notify: Payment already Success for order " + order_id + " — no action needed.");
                }
                // NOTE: Do NOT call confirmBooking() here.
                // confirmBooking() requires the slot to be in LOCKED state, but by the
                // time PayHere fires this notify the slot is already BOOKED (set by the
                // client-side onCompleted → /api/bookings/complete flow).
                // Calling it would throw "Cannot confirm: Slot is not locked" and roll
                // back the transaction — previously causing 500 errors in the Render logs.
            });
        }

        return ResponseEntity.ok("OK");
    }

    // ── MD5 helper ────────────────────────────────────────────
    private String md5(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
        BigInteger number = new BigInteger(1, digest);
        String hash = number.toString(16);
        while (hash.length() < 32)
            hash = "0" + hash;
        return hash;
    }
}