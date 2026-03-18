package com.starc.snipme.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final String FROM_ADDRESS = "admin.snipme@gmail.com";

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendTemporaryPassword(String toEmail, String tempPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(FROM_ADDRESS);
        message.setTo(toEmail);
        message.setSubject("SNIP ME – Temporary Password");
        message.setText(
            "Hi,\n\n" +
            "A password reset was requested for your SNIP ME account.\n\n" +
            "Your temporary password is: " + tempPassword + "\n\n" +
            "Please log in and change your password immediately in Settings.\n\n" +
            "If you did not request this, please ignore this email.\n\n" +
            "– The SNIP ME Team"
        );
        mailSender.send(message);
    }
}
