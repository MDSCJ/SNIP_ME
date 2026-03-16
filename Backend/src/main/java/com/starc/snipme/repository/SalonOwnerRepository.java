package com.starc.snipme.repository;

import com.starc.snipme.model.SalonOwner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SalonOwnerRepository extends JpaRepository<SalonOwner, Long> {
}
