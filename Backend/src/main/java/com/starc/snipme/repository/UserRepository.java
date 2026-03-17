package com.starc.snipme.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Used for Login and JWT validation
    Optional<User> findByEmail(String email);

    // Used during Sign-Up to prevent duplicate accounts
    boolean existsByEmail(String email);
}