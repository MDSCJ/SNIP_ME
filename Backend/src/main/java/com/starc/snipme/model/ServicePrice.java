package com.starc.snipme.model;

import jakarta.persistence.*;

@Entity
@Table(name = "service_prices", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"salon_id", "service_id"})
})
public class ServicePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "salon_id", nullable = false)
    private Long salonId;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(nullable = false)
    private Double price;

    // Constructors
    public ServicePrice() {}

    public ServicePrice(Long salonId, Long serviceId, Double price) {
        this.salonId = salonId;
        this.serviceId = serviceId;
        this.price = price;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public Long getSalonId() {
        return salonId;
    }

    public void setSalonId(Long salonId) {
        this.salonId = salonId;
    }

    public Long getServiceId() {
        return serviceId;
    }

    public void setServiceId(Long serviceId) {
        this.serviceId = serviceId;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }
}
