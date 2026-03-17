package com.starc.snipme.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.starc.snipme.security.JwtFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. Disable CSRF for development and stateless API testing
            .csrf(AbstractHttpConfigurer::disable)
            
            // 2. Disable Frame Options so the H2 Console can load in your browser
            .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable))
            
            // 3. Configure URL permissions
            .authorizeHttpRequests(auth -> auth
                // Allow anyone to access Auth endpoints and the Database console
                .requestMatchers("/api/auth/**", "/h2-console/**").permitAll()
                // Everything else requires a valid JWT
                .anyRequest().authenticated()
            )
            
            // 4. Ensure the server does not create a session (Stateless)
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // 5. Place your JWT Gatekeeper filter before the default login filter
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class); 

        return http.build();
    }
}