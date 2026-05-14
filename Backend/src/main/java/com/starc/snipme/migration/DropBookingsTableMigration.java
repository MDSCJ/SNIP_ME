package com.starc.snipme.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@ConditionalOnProperty(name = "app.migration.drop-bookings.enabled", havingValue = "true", matchIfMissing = false)
public class DropBookingsTableMigration implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DropBookingsTableMigration.class);
    private final JdbcTemplate jdbcTemplate;

    public DropBookingsTableMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            // Drop any foreign keys that reference bookings first.
            List<Map<String, Object>> fkRows = jdbcTemplate.queryForList(
                    """
                    SELECT table_name, constraint_name
                    FROM information_schema.key_column_usage
                    WHERE table_schema = DATABASE()
                      AND referenced_table_name = 'bookings'
                      AND constraint_name IS NOT NULL
                    """);

            for (Map<String, Object> row : fkRows) {
                String tableName = String.valueOf(row.get("table_name"));
                String constraintName = String.valueOf(row.get("constraint_name"));
                try {
                    jdbcTemplate.execute("ALTER TABLE `" + tableName + "` DROP FOREIGN KEY `" + constraintName + "`");
                    logger.info("DropBookingsTableMigration: dropped FK {} on {}", constraintName, tableName);
                } catch (Exception ex) {
                    logger.warn("DropBookingsTableMigration: failed dropping FK {} on {}: {}", constraintName, tableName, ex.getMessage());
                }
            }

            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bookings'",
                    Integer.class);
            if (count != null && count > 0) {
                jdbcTemplate.execute("DROP TABLE bookings");
                logger.info("DropBookingsTableMigration: dropped bookings table");
            } else {
                logger.info("DropBookingsTableMigration: bookings table not present, skipping");
            }

            // Cleanup legacy payments.booking_id if still present.
            Integer paymentBookingCol = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payments' AND column_name = 'booking_id'",
                    Integer.class);
            if (paymentBookingCol != null && paymentBookingCol > 0) {
                try {
                    jdbcTemplate.execute("ALTER TABLE payments DROP COLUMN booking_id");
                    logger.info("DropBookingsTableMigration: dropped legacy payments.booking_id column");
                } catch (Exception ex) {
                    logger.warn("DropBookingsTableMigration: could not drop payments.booking_id column: {}", ex.getMessage());
                }
            }
        } catch (Exception ex) {
            logger.warn("DropBookingsTableMigration skipped due to error: {}", ex.getMessage());
        }
    }
}
