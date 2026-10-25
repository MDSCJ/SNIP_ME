package com.starc.snipme.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.starc.snipme.repository.UserRepository;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Value("${app.admin.email:m.d.s.chamath@gmail.com}")
    private String adminEmail;

    // Manual constructor to handle Dependency Injection
    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (adminEmail != null && adminEmail.equalsIgnoreCase(email)) {
            return new org.springframework.security.core.userdetails.User(
                adminEmail,
                "N/A",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
            );
        }

        return userRepository.findByEmail(email)
                .map(user -> new org.springframework.security.core.userdetails.User(
                        user.getEmail(),
                        user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_" + databaseRole(user.getUserType())))
                ))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    // Admin rights come only from the configured admin email above. A database row
    // whose user_type was set to ADMIN (e.g. by tampering) gets no privileges.
    private static String databaseRole(String userType) {
        String type = userType == null ? "CUSTOMER" : userType.trim().toUpperCase();
        return switch (type) {
            case "CUSTOMER", "SALON_OWNER" -> type;
            default -> "NONE";
        };
    }
}