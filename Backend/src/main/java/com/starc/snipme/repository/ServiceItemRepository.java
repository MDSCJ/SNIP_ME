package com.starc.snipme.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.starc.snipme.model.ServiceItem;

@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {
    List<ServiceItem> findByIsActiveTrueOrderByNameAsc();
    List<ServiceItem> findByIsActiveTrueAndIncludeInSearchTrueOrderByNameAsc();
}
