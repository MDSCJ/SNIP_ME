package com.starc.snipme.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import com.starc.snipme.model.Booking;
import com.starc.snipme.model.Salon;
import com.starc.snipme.model.TimeSlot;
import com.starc.snipme.model.User;
import com.starc.snipme.repository.TimeSlotRepository;
import com.starc.snipme.repository.UserRepository;
import com.starc.snipme.security.CurrentUser;
import com.starc.snipme.security.JwtUtils;
import com.starc.snipme.security.UserDetailsServiceImpl;
import com.starc.snipme.service.BookingService;

@WebMvcTest(BookingController.class)
@AutoConfigureMockMvc(addFilters = false)
class BookingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TimeSlotRepository timeSlotRepository;

    @MockBean
    private BookingService bookingService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private UserDetailsServiceImpl userDetailsServiceImpl;

    @MockBean
    private CurrentUser currentUser;

    private Authentication customerAuth(String email) {
        return new UsernamePasswordAuthenticationToken(email, null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
    }

    private User customer(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    @Test
    void customerBookingsAlwaysUseTheAuthenticatedUser() throws Exception {
        Authentication auth = customerAuth("user@example.com");
        when(currentUser.user(any())).thenReturn(Optional.of(customer(42L)));
        when(bookingService.getBookingsForCustomer(42L)).thenReturn(List.of());

        // Asking for someone else's bookings is ignored; the caller's own are returned
        mockMvc.perform(get("/api/bookings/customer").param("customerID", "7").principal(auth))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(bookingService).getBookingsForCustomer(42L);
        verify(bookingService, never()).getBookingsForCustomer(7L);
    }

    @Test
    void cannotInitiateBookingAsAnotherCustomer() throws Exception {
        when(currentUser.user(any())).thenReturn(Optional.of(customer(42L)));

        mockMvc.perform(post("/api/bookings/initiate").param("slotID", "1").param("customerID", "7")
                .principal(customerAuth("user@example.com")))
                .andExpect(status().isForbidden());

        verify(bookingService, never()).initiateBooking(any(), any());
    }

    @Test
    void cannotCancelSomeoneElsesBooking() throws Exception {
        Salon salon = new Salon();
        TimeSlot slot = new TimeSlot();
        slot.setSalon(salon);
        Booking booking = new Booking();
        booking.setCustomer(customer(7L));

        when(timeSlotRepository.findById(1L)).thenReturn(Optional.of(slot));
        when(bookingService.getBookingsForSlot(1L)).thenReturn(booking);
        when(currentUser.user(any())).thenReturn(Optional.of(customer(42L)));
        when(currentUser.canManageSalon(any(), any())).thenReturn(false);

        mockMvc.perform(post("/api/bookings/cancel").param("slotID", "1")
                .principal(customerAuth("user@example.com")))
                .andExpect(status().isForbidden());

        verify(bookingService, never()).cancelBooking(any());
    }

    @Test
    void ownerCannotAddAppointmentToAnotherSalon() throws Exception {
        when(currentUser.canManageSalon(any(), any())).thenReturn(false);

        mockMvc.perform(post("/api/bookings/owner/add")
                .contentType("application/json")
                .content("{\"salonID\":5,\"startTime\":\"2026-11-01T10:00:00\"}")
                .principal(customerAuth("owner@example.com")))
                .andExpect(status().isForbidden());

        verify(bookingService, never()).createOwnerAppointment(any(), any(), any(), any());
    }
}
