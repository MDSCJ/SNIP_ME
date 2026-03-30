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
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LegacyPaymentsTableMigration implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(LegacyPaymentsTableMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public LegacyPaymentsTableMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            Integer hasOldTable = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payements'",
                Integer.class
            );

            if (hasOldTable == null || hasOldTable == 0) {
                return;
            }

            Integer hasNewTable = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payments'",
                Integer.class
            );

            if (hasNewTable != null && hasNewTable > 0) {
                int inserted = jdbcTemplate.update(
                    """
                    INSERT INTO payments (amount, payment_status, transaction_date, booking_id)
                    SELECT p.amount, p.payment_status, p.transaction_date, p.booking_id
                    FROM payements p
                    LEFT JOIN payments n ON n.booking_id = p.booking_id
                    WHERE n.booking_id IS NULL
                    """
                );
                logger.info("Legacy table migration: copied {} rows from payements to payments", inserted);
                jdbcTemplate.execute("DROP TABLE IF EXISTS payements");
                logger.info("Legacy table migration: dropped old table payements");
                return;
            }

            jdbcTemplate.execute("RENAME TABLE payements TO payments");
            logger.info("Legacy table migration: renamed payements to payments");
        } catch (Exception ex) {
            logger.warn("Legacy table migration skipped due to error: {}", ex.getMessage());
        }
    }
}