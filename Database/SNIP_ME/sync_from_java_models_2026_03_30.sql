-- Synchronize MySQL schema with Backend/src/main/java/com/starc/snipme/model
-- Generated from current JPA entities on 2026-03-30

-- USERS
CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone_number VARCHAR(255),
    user_type VARCHAR(255) NOT NULL,
    PRIMARY KEY (email)
) ENGINE=InnoDB;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(255) NOT NULL;
ALTER TABLE users DROP COLUMN IF EXISTS access_level;
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS salon_name;
ALTER TABLE users DROP COLUMN IF EXISTS salon_address;

-- TIME SLOTS
CREATE TABLE IF NOT EXISTS time_slots (
    slotid BIGINT NOT NULL AUTO_INCREMENT,
    start_time DATETIME(6) NOT NULL,
    status VARCHAR(255) NOT NULL,
    locked_at DATETIME(6),
    PRIMARY KEY (slotid)
) ENGINE=InnoDB;

ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS start_time DATETIME(6) NOT NULL;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS locked_at DATETIME(6);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    bookingid BIGINT NOT NULL AUTO_INCREMENT,
    date DATETIME(6) NOT NULL,
    status VARCHAR(255) NOT NULL,
    slot_id BIGINT NOT NULL,
    customerid BIGINT NOT NULL,
    PRIMARY KEY (bookingid),
    UNIQUE KEY uk_bookings_slot_id (slot_id),
    CONSTRAINT fk_bookings_slot_id FOREIGN KEY (slot_id) REFERENCES time_slots(slotid)
) ENGINE=InnoDB;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATETIME(6) NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slot_id BIGINT NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customerid BIGINT NOT NULL;

-- SALONS
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
    PRIMARY KEY (salonid)
) ENGINE=InnoDB;

ALTER TABLE salons ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS details VARCHAR(255);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS phone_number VARCHAR(255);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS opening_time TIME(6);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS closing_time TIME(6);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS latitude DOUBLE;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS longitude DOUBLE;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS n_of_ratings INT NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS rate DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS is_active BIT(1) NOT NULL DEFAULT b'1';

-- Move legacy description values from address into details when details is empty.
UPDATE salons
SET details = address
WHERE details IS NULL AND address IS NOT NULL;

-- SERVICES (admin-managed service catalog and salon services)
CREATE TABLE IF NOT EXISTS services (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    salon_id BIGINT,
    include_in_search BIT(1) NOT NULL DEFAULT b'1',
    is_active BIT(1) NOT NULL DEFAULT b'1',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

ALTER TABLE services ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS salon_id BIGINT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS include_in_search BIT(1) NOT NULL DEFAULT b'1';
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BIT(1) NOT NULL DEFAULT b'1';
ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);

-- PAYMENTS
-- If older misspelled table exists, rename it first so existing data is preserved.
SET @has_old_payements := (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'payements'
);
SET @has_new_payments := (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'payments'
);
SET @rename_payements_sql := IF(
    @has_old_payements = 1 AND @has_new_payments = 0,
    'RENAME TABLE payements TO payments',
    'SELECT 1'
);
PREPARE stmt_rename_payements FROM @rename_payements_sql;
EXECUTE stmt_rename_payements;
DEALLOCATE PREPARE stmt_rename_payements;

CREATE TABLE IF NOT EXISTS payments (
    paymentid BIGINT NOT NULL AUTO_INCREMENT,
    amount DOUBLE,
    payment_status VARCHAR(255),
    transaction_date DATETIME(6),
    booking_id BIGINT NOT NULL,
    PRIMARY KEY (paymentid),
    UNIQUE KEY uk_payments_booking_id (booking_id),
    CONSTRAINT fk_payments_booking_id FOREIGN KEY (booking_id) REFERENCES bookings(bookingid)
) ENGINE=InnoDB;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount DOUBLE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_date DATETIME(6);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS booking_id BIGINT NOT NULL;

-- If both tables exist, migrate any missing rows and remove the legacy table.
SET @has_old_payements := (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'payements'
);
SET @merge_payements_sql := IF(
    @has_old_payements = 1,
    'INSERT INTO payments (amount, payment_status, transaction_date, booking_id) SELECT p.amount, p.payment_status, p.transaction_date, p.booking_id FROM payements p LEFT JOIN payments n ON n.booking_id = p.booking_id WHERE n.booking_id IS NULL',
    'SELECT 1'
);
PREPARE stmt_merge_payements FROM @merge_payements_sql;
EXECUTE stmt_merge_payements;
DEALLOCATE PREPARE stmt_merge_payements;

DROP TABLE IF EXISTS payements;
