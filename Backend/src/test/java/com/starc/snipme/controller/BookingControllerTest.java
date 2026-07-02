package com.starc.snipme.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import com.starc.snipme.model.User;
import com.starc.snipme.repository.TimeSlotRepository;
import com.starc.snipme.repository.UserRepository;
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

    @Test
    void shouldLoadBookingsByEmailWhenCustomerIdIsMissing() throws Exception {
        User customer = new User();
        customer.setId(42L);

        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(customer));
        when(bookingService.getBookingsForCustomer(42L)).thenReturn(List.of());

        mockMvc.perform(get("/api/bookings/customer").param("email", "user@example.com"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(bookingService).getBookingsForCustomer(42L);
    }
}
