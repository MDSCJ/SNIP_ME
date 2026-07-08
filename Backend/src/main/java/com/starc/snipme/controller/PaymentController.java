package com.starc.snipme.controller;

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

    // ── PayHere Credentials ──────────────────────────────────────────────────
    // Set these on Render as environment variables:
    // PAYHERE_MERCHANT_ID = your sandbox or live merchant ID
    // PAYHERE_MERCHANT_SECRET = the matching merchant secret
    // PAYHERE_SANDBOX_MODE = true → sandbox popup (for testing)
    // false → live popup (real payments)
    @Value("${payhere.merchant.id}")
    private String merchantId;

    @Value("${payhere.merchant.secret}")
    private String merchantSecret;

    /** true = sandbox mode everywhere; false = live mode */
    private boolean sandboxMode = true; // Hardcoded to true as requested

    public PaymentController(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    // ── GET /api/payment/hash ─────────────────────────────────────────────────
    // Called by booking.js before opening the PayHere popup.
    // Returns the MD5 hash AND the sandbox flag so the frontend never has to
    // guess which mode to use.
    @GetMapping("/hash")
    public ResponseEntity<Map<String, String>> generateHash(
            @RequestParam String orderId,
            @RequestParam String amount,
            @RequestParam(defaultValue = "LKR") String currency,
            HttpServletRequest request) {

        try {
            String origin = request.getHeader("Origin");
            String referer = request.getHeader("Referer");
            System.out.println("=== PayHere Hash Request ===");
            System.out.println("Origin   : " + origin);
            System.out.println("Referer  : " + referer);
            System.out.println("Mode     : " + (sandboxMode ? "SANDBOX" : "LIVE"));
            System.out.println("Merchant : " + merchantId);
            System.out.println("Amount   : " + amount + " " + currency);
            System.out.println("OrderID  : " + orderId);

            // Generate hash: MD5( merchant_id + order_id + amount + currency +
            // MD5(secret).toUpperCase() )
            String hashedSecret = md5(merchantSecret).toUpperCase();
            String rawString = merchantId + orderId + amount + currency + hashedSecret;
            String hash = md5(rawString).toUpperCase();

            System.out.println("Hash     : " + hash);
            System.out.println("============================");

            Map<String, String> response = new HashMap<>();
            response.put("merchant_id", merchantId);
            response.put("order_id", orderId);
            response.put("amount", amount);
            response.put("currency", currency);
            response.put("hash", hash);
            // Tell the frontend which popup mode to use — sandbox or live.
            // Frontend must use this value directly; do NOT guess from hostname.
            response.put("sandbox", String.valueOf(sandboxMode));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Hash generation error: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── POST /api/payment/notify ──────────────────────────────────────────────
    // PayHere server webhook. Safety net only: our client-side onCompleted flow
    // already confirms the booking via /api/bookings/complete before this fires.
    // We only update the Payment row here if it wasn't already marked Success.
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
                if (!"Success".equalsIgnoreCase(payment.getPaymentStatus())) {
                    payment.setPaymentStatus("Success");
                    paymentRepository.save(payment);
                    System.out.println("Notify: Payment marked Success for order " + order_id);
                } else {
                    System.out.println("Notify: Payment already Success for order " + order_id + " — skipping.");
                }
                // Do NOT call confirmBooking() here — slot is already BOOKED by the
                // client-side onCompleted → /api/bookings/complete flow.
            });
        }

        return ResponseEntity.ok("OK");
    }

    // ── MD5 helper ────────────────────────────────────────────────────────────
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