package com.starc.snipme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.Salon;

@Repository
public interface SalonRepository extends JpaRepository<Salon, Long> {
}
