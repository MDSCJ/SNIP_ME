package com.starc.snipme;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SnipmeApplication {

	public static void main(String[] args) {
		SpringApplication.run(SnipmeApplication.class, args);
	}

}
