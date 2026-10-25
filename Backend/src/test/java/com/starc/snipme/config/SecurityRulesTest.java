package com.starc.snipme.config;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.starc.snipme.controller.BookingController;
import com.starc.snipme.repository.TimeSlotRepository;
import com.starc.snipme.repository.UserRepository;
import com.starc.snipme.security.CurrentUser;
import com.starc.snipme.security.JwtUtils;
import com.starc.snipme.security.UserDetailsServiceImpl;
import com.starc.snipme.service.BookingService;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@WebMvcTest(BookingController.class)
@Import({ SecurityConfig.class, JwtUtils.class })
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-that-is-definitely-longer-than-32-bytes",
        "app.jwt.expiration=600000",
        "app.cors.allowed-origins=https://mdscj.github.io"
})
class SecurityRulesTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtils jwtUtils;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;
    @MockBean
    private CurrentUser currentUser;
    @MockBean
    private TimeSlotRepository timeSlotRepository;
    @MockBean
    private BookingService bookingService;
    @MockBean
    private UserRepository userRepository;

    private String customerToken;

    @BeforeEach
    void setUp() {
        when(userDetailsService.loadUserByUsername("cust@example.com")).thenReturn(
                new User("cust@example.com", "x", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        customerToken = jwtUtils.generateToken("cust@example.com");
    }

    @Test
    void anonymousCannotReachPrivateEndpoints() throws Exception {
        mockMvc.perform(get("/api/bookings/customer")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/bookings/all")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/bookings/cancel").param("slotID", "1")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/owner-profile")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/payment/hash")).andExpect(status().isUnauthorized());
    }

    @Test
    void customerCannotReachAdminOrOwnerEndpoints() throws Exception {
        String bearer = "Bearer " + customerToken;
        mockMvc.perform(get("/api/admin/users").header("Authorization", bearer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/auth/owner-profile").header("Authorization", bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/salon-owner/notifications/1").header("Authorization", bearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/bookings/owner/add").header("Authorization", bearer))
                .andExpect(status().isForbidden());
    }

    @Test
    void tokenSignedWithTheOldPublicSecretIsRejected() throws Exception {
        String forged = Jwts.builder()
                .subject("cust@example.com")
                .expiration(new Date(System.currentTimeMillis() + 600000))
                .signWith(Keys.hmacShaKeyFor(
                        "YourSuperSecretKeyThatIsAtLeast32CharactersLong!".getBytes(StandardCharsets.UTF_8)))
                .compact();

        mockMvc.perform(get("/api/bookings/customer").header("Authorization", "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicEndpointsStayOpen() throws Exception {
        mockMvc.perform(get("/api/bookings/taken-slots").param("salonId", "1").param("date", "2026-11-01"))
                .andExpect(status().isOk());
    }
}
