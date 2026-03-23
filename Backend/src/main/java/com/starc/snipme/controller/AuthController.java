package com.starc.snipme.controller;

import com.starc.snipme.dto.*;
import com.starc.snipme.model.*;
import com.starc.snipme.repository.UserRepository;
import com.starc.snipme.security.JwtUtils;
import com.starc.snipme.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.security.SecureRandom;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private static final String HARDCODED_ADMIN_EMAIL = "m.d.s.chamath@gmail.com";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          JwtUtils jwtUtils, EmailService emailService) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils        = jwtUtils;
        this.emailService    = emailService;
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        String normalizedEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();

        if (normalizedEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already in use!"));
        }

        String requestedRole = (request.getRole() != null) ? request.getRole().trim().toUpperCase() : "CUSTOMER";
        if (requestedRole.isBlank()) {
            requestedRole = "CUSTOMER";
        }

        String roleStr = requestedRole;

        if (HARDCODED_ADMIN_EMAIL.equalsIgnoreCase(normalizedEmail)) {
            roleStr = "ADMIN";
        } else if ("ADMIN".equals(roleStr)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Admin role is reserved for the system admin email."));
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        try {
            user.setRole(UserRole.valueOf(roleStr));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role."));
        }

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User registered successfully!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest authRequest) {
        String normalizedEmail = authRequest.getEmail() == null ? "" : authRequest.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (userOpt.isPresent() && passwordEncoder.matches(authRequest.getPassword(), userOpt.get().getPassword())) {
            String token = jwtUtils.generateToken(userOpt.get().getEmail());
            return ResponseEntity.ok(new AuthResponse(token));
        }

        return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);

        // Always respond the same way to prevent user-enumeration
        if (userOpt.isEmpty()) {
            logger.info("Forgot-password requested for non-existing account: {}", normalizedEmail);
            return ResponseEntity.ok(Map.of("message", "If that email is registered, a temporary password has been sent."));
        }

        String tempPassword = generateTempPassword();

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        try {
            emailService.sendTemporaryPassword(normalizedEmail, tempPassword);
            logger.info("Temporary password email sent to {}", normalizedEmail);
        } catch (Exception ex) {
            logger.error("Failed to send temporary password email to {}", normalizedEmail, ex);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to send email. Please try again later."));
        }

        return ResponseEntity.ok(Map.of("message", "If that email is registered, a temporary password has been sent."));
    }

    private String generateTempPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
