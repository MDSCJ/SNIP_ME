package com.starc.snipme.controller;

import com.starc.snipme.dto.*;
import com.starc.snipme.model.*;
import com.starc.snipme.repository.UserRepository;
import com.starc.snipme.security.JwtUtils;
import com.starc.snipme.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.security.SecureRandom;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

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
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already in use!"));
        }

        User user;
        String roleStr = (request.getRole() != null) ? request.getRole().toUpperCase() : "CUSTOMER";

        if ("SALON_OWNER".equals(roleStr)) {
            SalonOwner owner = new SalonOwner();
            owner.setName(request.getName());
            owner.setPhoneNumber(request.getPhoneNumber());
            owner.setSalonName(request.getSalonName());
            owner.setSalonAddress(request.getSalonAddress());
            user = owner;
        } else if ("ADMIN".equals(roleStr)) {
            Admin admin = new Admin();
            admin.setAccessLevel(request.getAccessLevel() != null ? request.getAccessLevel() : 1);
            user = admin;
        } else {
            Customer customer = new Customer();
            customer.setName(request.getName());
            customer.setPhoneNumber(request.getPhoneNumber());
            user = customer;
        }

        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.valueOf(roleStr));

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User registered successfully!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest authRequest) {
        Optional<User> userOpt = userRepository.findByEmail(authRequest.getEmail());

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

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());

        // Always respond the same way to prevent user-enumeration
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("message", "If that email is registered, a temporary password has been sent."));
        }

        String tempPassword = generateTempPassword();

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        try {
            emailService.sendTemporaryPassword(email.trim(), tempPassword);
        } catch (Exception ex) {
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
