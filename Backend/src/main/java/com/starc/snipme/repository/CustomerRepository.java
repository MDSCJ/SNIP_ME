package com.starc.snipme.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.Customer;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    // Useful for profile lookups or admin searches
    Optional<Customer> findByName(String name);
}