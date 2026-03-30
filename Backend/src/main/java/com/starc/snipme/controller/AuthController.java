package com.starc.snipme.controller;

import com.starc.snipme.dto.*;
import com.starc.snipme.model.*;
import com.starc.snipme.repository.SalonRepository;
import com.starc.snipme.repository.UserRepository;
import com.starc.snipme.security.JwtUtils;
import com.starc.snipme.service.EmailService;
import com.starc.snipme.service.LoginSessionTracker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.admin.email:m.d.s.chamath@gmail.com}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    private final UserRepository userRepository;
    private final SalonRepository salonRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;
    private final LoginSessionTracker loginSessionTracker;

    public AuthController(UserRepository userRepository, SalonRepository salonRepository, PasswordEncoder passwordEncoder,
                          JwtUtils jwtUtils, EmailService emailService, LoginSessionTracker loginSessionTracker) {
        this.userRepository  = userRepository;
        this.salonRepository = salonRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils        = jwtUtils;
        this.emailService    = emailService;
        this.loginSessionTracker = loginSessionTracker;
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        String normalizedEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String normalizedName = request.getName() == null ? "" : request.getName().trim();
        String normalizedPhone = request.getPhoneNumber() == null ? "" : request.getPhoneNumber().trim();
        String normalizedSalonName = request.getSalonName() == null ? "" : request.getSalonName().trim();
        String normalizedSalonDetails = request.getSalonAddress() == null ? "" : request.getSalonAddress().trim();

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

        if (adminEmail != null && adminEmail.equalsIgnoreCase(normalizedEmail)) {
            roleStr = "ADMIN";
        } else if ("ADMIN".equals(roleStr)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Admin role is reserved for the system admin email."));
        }

        if (("CUSTOMER".equals(roleStr) || "SALON_OWNER".equals(roleStr))
                && (normalizedName.isBlank() || normalizedPhone.isBlank())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Name and phone number are required."));
        }

        if ("SALON_OWNER".equals(roleStr) && normalizedSalonName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Salon name is required for salon owner accounts."));
        }

        if ("SALON_OWNER".equals(roleStr) && normalizedSalonDetails.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Salon details are required for salon owner accounts."));
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(normalizedName.isBlank() ? null : normalizedName);
        user.setPhoneNumber(normalizedPhone.isBlank() ? null : normalizedPhone);
        user.setUserType(roleStr);

        userRepository.save(user);

        if ("SALON_OWNER".equals(roleStr)) {
            Salon salon = new Salon();
            salon.setName(normalizedSalonName);
            salon.setDetails(normalizedSalonDetails);
            salon.setEmail(normalizedEmail);
            salon.setPhoneNumber(normalizedPhone.isBlank() ? null : normalizedPhone);
            salon.setOwnerUserId(user.getId());
            salonRepository.save(salon);
        }

        return ResponseEntity.ok(Map.of("message", "User registered successfully!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest authRequest) {
        String normalizedEmail = authRequest.getEmail() == null ? "" : authRequest.getEmail().trim().toLowerCase();

        if (adminEmail != null && adminEmail.equalsIgnoreCase(normalizedEmail)
            && adminPassword != null && !adminPassword.isBlank()
            && adminPassword.equals(authRequest.getPassword())) {
            String token = jwtUtils.generateToken(normalizedEmail);
            loginSessionTracker.markLogin(normalizedEmail, "ADMIN");
            return ResponseEntity.ok(new AuthResponse(token, "Admin", "", normalizedEmail, "ADMIN"));
        }

        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (userOpt.isPresent() && passwordEncoder.matches(authRequest.getPassword(), userOpt.get().getPassword())) {
            User user = userOpt.get();
            String token = jwtUtils.generateToken(user.getEmail());
            String safeName = (user.getName() == null || user.getName().isBlank())
                    ? user.getEmail().split("@")[0]
                    : user.getName();
            String safePhone = user.getPhoneNumber() == null ? "" : user.getPhoneNumber();
            String safeUserType = user.getUserType() == null ? "CUSTOMER" : user.getUserType();
            loginSessionTracker.markLogin(user.getEmail(), safeUserType);
            return ResponseEntity.ok(new AuthResponse(token, safeName, safePhone, user.getEmail(), safeUserType));
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
