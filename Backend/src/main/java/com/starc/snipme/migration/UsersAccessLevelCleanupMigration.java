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
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class UsersAccessLevelCleanupMigration implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(UsersAccessLevelCleanupMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public UsersAccessLevelCleanupMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            Integer hasAccessLevel = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'access_level'",
                Integer.class
            );

            if (hasAccessLevel != null && hasAccessLevel > 0) {
                jdbcTemplate.execute("ALTER TABLE users DROP COLUMN access_level");
                logger.info("Users cleanup migration: dropped users.access_level");
            }

            Integer hasRole = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'role'",
                Integer.class
            );

            if (hasRole != null && hasRole > 0) {
                jdbcTemplate.execute("ALTER TABLE users DROP COLUMN role");
                logger.info("Users cleanup migration: dropped users.role");
            }

            Integer hasSalonName = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'salon_name'",
                Integer.class
            );

            if (hasSalonName != null && hasSalonName > 0) {
                jdbcTemplate.execute("ALTER TABLE users DROP COLUMN salon_name");
                logger.info("Users cleanup migration: dropped users.salon_name");
            }

            Integer hasSalonAddress = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'salon_address'",
                Integer.class
            );

            if (hasSalonAddress != null && hasSalonAddress > 0) {
                jdbcTemplate.execute("ALTER TABLE users DROP COLUMN salon_address");
                logger.info("Users cleanup migration: dropped users.salon_address");
            }
        } catch (Exception ex) {
            logger.warn("Users cleanup migration skipped due to error: {}", ex.getMessage());
        }
    }
}
