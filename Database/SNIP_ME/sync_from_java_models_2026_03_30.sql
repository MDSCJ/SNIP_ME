-- Bootstrap schema for the live MySQL database used by SNIP ME.
-- This version matches the current JPA entities so defaultdb can be
-- created from scratch with bookings and payments wired correctly.

CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone_number VARCHAR(255),
    user_type VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS salons (
    salonid BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    details VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(255),
    phone_number VARCHAR(255),
    email VARCHAR(255),
    opening_time TIME(6),
    closing_time TIME(6),
    latitude DOUBLE,
    longitude DOUBLE,
    n_of_ratings INT NOT NULL DEFAULT 0,
    rate DOUBLE NOT NULL DEFAULT 0,
    is_active BIT(1) NOT NULL DEFAULT b'1',
    owner_user_id BIGINT,
    photo_low_quality LONGTEXT,
    holidays LONGTEXT,
    PRIMARY KEY (salonid),
    UNIQUE KEY uk_salons_owner_user_id (owner_user_id),
    CONSTRAINT fk_salons_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS services (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    include_in_search BIT(1) NOT NULL DEFAULT b'1',
    is_active BIT(1) NOT NULL DEFAULT b'1',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS time_slots (
    slotid BIGINT NOT NULL AUTO_INCREMENT,
    start_time DATETIME(6) NOT NULL,
    salon_id BIGINT NOT NULL,
    status VARCHAR(255) NOT NULL,
    locked_at DATETIME(6),
    PRIMARY KEY (slotid),
    UNIQUE KEY uk_time_slots_salon_start_time (salon_id, start_time),
    CONSTRAINT fk_time_slots_salon_id FOREIGN KEY (salon_id) REFERENCES salons(salonid)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
    bookingid BIGINT NOT NULL AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    salon_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    slot_id BIGINT NOT NULL,
    status VARCHAR(255) NOT NULL,
    booking_date DATETIME(6) NOT NULL,
    PRIMARY KEY (bookingid),
    UNIQUE KEY uk_bookings_slot_id (slot_id),
    CONSTRAINT fk_bookings_customer_id FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_bookings_salon_id FOREIGN KEY (salon_id) REFERENCES salons(salonid),
    CONSTRAINT fk_bookings_service_id FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT fk_bookings_slot_id FOREIGN KEY (slot_id) REFERENCES time_slots(slotid)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
    paymentid BIGINT NOT NULL AUTO_INCREMENT,
    amount DOUBLE,
    payment_status VARCHAR(255),
    transaction_date DATETIME(6),
    booking_id BIGINT NOT NULL,
    order_id VARCHAR(255),
    PRIMARY KEY (paymentid),
    UNIQUE KEY uk_payments_booking_id (booking_id),
    UNIQUE KEY uk_payments_order_id (order_id),
    CONSTRAINT fk_payments_booking_id FOREIGN KEY (booking_id) REFERENCES bookings(bookingid)
) ENGINE=InnoDB;
