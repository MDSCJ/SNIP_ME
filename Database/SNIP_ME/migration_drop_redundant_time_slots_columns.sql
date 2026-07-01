-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Drop redundant columns from time_slots
-- Run ONCE on the live MySQL database after deploying the updated Spring Boot app.
--
-- Background:
--   customer_id, service_id, customer_name, service_name were added to time_slots
--   by Hibernate ddl-auto=update when they were mapped in TimeSlot.java.
--   They are now REMOVED from the Java model because that data already lives on
--   the `bookings` table (which is the authoritative source of truth).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the FK constraints first (Hibernate-generated names; adjust if yours differ)
ALTER TABLE time_slots DROP FOREIGN KEY IF EXISTS FKtime_slots_customer_id;
ALTER TABLE time_slots DROP FOREIGN KEY IF EXISTS FKtime_slots_service_id;

-- If you are unsure of the exact constraint names, run this to find them:
--   SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
--   WHERE TABLE_NAME = 'time_slots' AND CONSTRAINT_TYPE = 'FOREIGN KEY';

-- 2. Drop the redundant columns
ALTER TABLE time_slots
    DROP COLUMN IF EXISTS customer_id,
    DROP COLUMN IF EXISTS service_id,
    DROP COLUMN IF EXISTS customer_name,
    DROP COLUMN IF EXISTS service_name;

-- Done. The time_slots table now only holds:
--   slotid, start_time, salon_id, status, locked_at
