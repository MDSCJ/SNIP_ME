package com.starc.snipme.security;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import com.starc.snipme.model.Salon;
import com.starc.snipme.model.User;
import com.starc.snipme.repository.SalonRepository;
import com.starc.snipme.repository.UserRepository;

/**
 * Resolves the authenticated caller from the JWT-backed SecurityContext.
 * Controllers must use this instead of trusting email / customerID / salonId
 * values sent by the client.
 */
@Component
public class CurrentUser {

    private final UserRepository userRepository;
    private final SalonRepository salonRepository;

    public CurrentUser(UserRepository userRepository, SalonRepository salonRepository) {
        this.userRepository = userRepository;
        this.salonRepository = salonRepository;
    }

    public Optional<String> email(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            return Optional.empty();
        }
        return Optional.of(authentication.getName().trim().toLowerCase());
    }

    public Optional<User> user(Authentication authentication) {
        return email(authentication).flatMap(userRepository::findByEmailIgnoreCase);
    }

    public boolean hasRole(Authentication authentication, String role) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (("ROLE_" + role).equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    public boolean isAdmin(Authentication authentication) {
        return hasRole(authentication, "ADMIN");
    }

    /** The salon owned by the caller, if the caller is a salon owner. */
    public Optional<Salon> ownedSalon(Authentication authentication) {
        Optional<User> userOpt = user(authentication);
        if (userOpt.isEmpty() || !"SALON_OWNER".equalsIgnoreCase(userOpt.get().getUserType())) {
            return Optional.empty();
        }
        User user = userOpt.get();
        Optional<Salon> salon = salonRepository.findByOwnerUserId(user.getId());
        if (salon.isEmpty()) {
            salon = salonRepository.findByEmailIgnoreCase(user.getEmail());
        }
        return salon;
    }

    /** True if the caller is an admin or owns the given salon. */
    public boolean canManageSalon(Authentication authentication, Long salonId) {
        if (salonId == null) {
            return false;
        }
        if (isAdmin(authentication)) {
            return true;
        }
        return ownedSalon(authentication).map(s -> salonId.equals(s.getSalonID())).orElse(false);
    }
}
