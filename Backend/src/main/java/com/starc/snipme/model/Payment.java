package com.starc.snipme.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long paymentID;

    private Double amount;
    private String paymentStatus; // "Success" or "Failed"
    private LocalDateTime transactionDate;

    //Link this payment to a specific finalized booking
    @OneToOne
    @JoinColumn (name = "booking_id", nullable = false)
    private Booking booking;

    //Default constructor dor Spring Boot
    public Payment(){}

    public Payment(Double amount, String paymentStatus,Booking booking){
        this.amount= amount;
        this.paymentStatus = paymentStatus;
        this.transactionDate = LocalDateTime.now();
        this.booking = booking;
    }

    //Getter and Setters
    public Long getPaymentID(){return paymentID;}
    public Double getAmount(){return amount;}
    public void setAmount(Double amount){this.amount = amount;}
    public String getPaymentStatus(){return paymentStatus;}
    public void setPaymentStatus(String paymentStatus){this.paymentStatus = paymentStatus;}
    public LocalDateTime getTransactionDate(){return transactionDate;}
    public void setTransactionDate(LocalDateTime transactionDate){this.transactionDate = transactionDate;}
    public Booking getBooking(){return booking;}
    public void setBooking(Booking booking){this.booking = booking;}
}
