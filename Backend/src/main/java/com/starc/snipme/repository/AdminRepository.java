package com.starc.snipme.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.Admin;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {
    // Specifically find an admin account by email
    Optional<Admin> findByEmail(String email);
}