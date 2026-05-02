package com.starc.snipme.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/payment")
public class PaymentController {

    // ── PayHere Sandbox Credentials ───────────────────────
    private static final String MERCHANT_ID     = "1235274";
    private static final String MERCHANT_SECRET = "Mjg2ODM5NDc3OTU4ODM2Njg4NTM5NDc2MDU0MDk3NzI1NTE4MDg=";

    // ─────────────────────────────────────────────────────
    // GET /api/payment/hash
    // Called by booking.js to get secure hash for PayHere
    // Params: orderId, amount, currency
    // ─────────────────────────────────────────────────────
    @GetMapping("/hash")
    public ResponseEntity<Map<String, String>> generateHash(
            @RequestParam String orderId,
            @RequestParam String amount,
            @RequestParam(defaultValue = "LKR") String currency) {

        try {
            // Step 1: MD5 of merchant secret (uppercase)
            String hashedSecret = md5(MERCHANT_SECRET).toUpperCase();

            // Step 2: MD5 of full string (uppercase)
            String rawString = MERCHANT_ID + orderId + amount + currency + hashedSecret;
            String hash      = md5(rawString).toUpperCase();

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

    // ─────────────────────────────────────────────────────
    // POST /api/payment/notify
    // PayHere calls this after payment is processed
    // (PayHere sandbox calls this server-to-server)
    // ─────────────────────────────────────────────────────
    @PostMapping("/notify")
    public ResponseEntity<String> paymentNotify(
            @RequestParam(required = false) String merchant_id,
            @RequestParam(required = false) String order_id,
            @RequestParam(required = false) String payment_id,
            @RequestParam(required = false) String payhere_amount,
            @RequestParam(required = false) String payhere_currency,
            @RequestParam(required = false) String status_code,
            @RequestParam(required = false) String md5sig) {

        // Log payment notification
        System.out.println("=== PayHere Notification ===");
        System.out.println("Order ID    : " + order_id);
        System.out.println("Payment ID  : " + payment_id);
        System.out.println("Amount      : " + payhere_amount);
        System.out.println("Status Code : " + status_code);
        // status_code: 2=success, 0=pending, -1=cancelled, -2=failed
        System.out.println("============================");

        return ResponseEntity.ok("OK");
    }

    // ── MD5 helper ────────────────────────────────────────
    private String md5(String input) throws Exception {
        MessageDigest md      = MessageDigest.getInstance("MD5");
        byte[] digest         = md.digest(input.getBytes(StandardCharsets.UTF_8));
        BigInteger number     = new BigInteger(1, digest);
        String hashText       = number.toString(16);
        while (hashText.length() < 32) hashText = "0" + hashText;
        return hashText;
    }
}