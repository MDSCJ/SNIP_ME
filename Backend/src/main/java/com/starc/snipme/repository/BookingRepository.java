package com.starc.snipme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.Booking;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long>{
//auth controllers and services will be added here
}
