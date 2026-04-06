package com.starc.snipme.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 3)
public class SalonProfileColumnsMigration implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(SalonProfileColumnsMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public SalonProfileColumnsMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            Integer hasPhotoLowQuality = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'salons' AND column_name = 'photo_low_quality'",
                Integer.class
            );

            if (hasPhotoLowQuality == null || hasPhotoLowQuality == 0) {
                jdbcTemplate.execute("ALTER TABLE salons ADD COLUMN photo_low_quality LONGTEXT NULL");
                logger.info("Salon profile migration: added salons.photo_low_quality");
            }

            Integer hasWorkingDays = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'salons' AND column_name = 'working_days'",
                Integer.class
            );

            Integer hasHolidays = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'salons' AND column_name = 'holidays'",
                Integer.class
            );

            if ((hasHolidays == null || hasHolidays == 0) && (hasWorkingDays != null && hasWorkingDays > 0)) {
                // Migrate old working_days column to new holidays column
                try {
                    jdbcTemplate.execute("ALTER TABLE salons CHANGE working_days holidays LONGTEXT NULL");
                    logger.info("Salon profile migration: successfully renamed salons.working_days to salons.holidays");
                } catch (Exception renameEx) {
                    logger.error("Failed to rename working_days to holidays: {}", renameEx.getMessage());
                    // Try to add holidays column if rename failed
                    try {
                        jdbcTemplate.execute("ALTER TABLE salons ADD COLUMN holidays LONGTEXT NULL");
                        logger.info("Salon profile migration: added salons.holidays column after failed rename");
                    } catch (Exception addEx) {
                        logger.error("Failed to add holidays column: {}", addEx.getMessage());
                    }
                }
            } else if (hasHolidays == null || hasHolidays == 0) {
                // Create new column if neither exists
                try {
                    jdbcTemplate.execute("ALTER TABLE salons ADD COLUMN holidays LONGTEXT NULL");
                    logger.info("Salon profile migration: added salons.holidays");
                } catch (Exception addEx) {
                    logger.error("Failed to add holidays column: {}", addEx.getMessage());
                }
            } else {
                logger.info("Salon profile migration: holidays column already exists");
            }

            Integer hasOpeningTime = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'salons' AND column_name = 'opening_time'",
                Integer.class
            );

            if (hasOpeningTime == null || hasOpeningTime == 0) {
                jdbcTemplate.execute("ALTER TABLE salons ADD COLUMN opening_time TIME NULL");
                logger.info("Salon profile migration: added salons.opening_time");
            }

            Integer hasClosingTime = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'salons' AND column_name = 'closing_time'",
                Integer.class
            );

            if (hasClosingTime == null || hasClosingTime == 0) {
                jdbcTemplate.execute("ALTER TABLE salons ADD COLUMN closing_time TIME NULL");
                logger.info("Salon profile migration: added salons.closing_time");
            }
            
            logger.info("Salon profile migration completed successfully");
        } catch (Exception ex) {
            logger.error("Salon profile migration error: {}", ex.getMessage(), ex);
        }
    }
}
