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
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class SalonOwnerUserLinkMigration implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(SalonOwnerUserLinkMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public SalonOwnerUserLinkMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            Integer hasOwnerUserId = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'salons' AND column_name = 'owner_user_id'",
                Integer.class
            );

            if (hasOwnerUserId == null || hasOwnerUserId == 0) {
                jdbcTemplate.execute("ALTER TABLE salons ADD COLUMN owner_user_id BIGINT NULL");
                logger.info("Salon-owner link migration: added salons.owner_user_id");
            }

            int linkedByEmail = jdbcTemplate.update(
                """
                UPDATE salons s
                JOIN users u ON LOWER(s.email) = LOWER(u.email)
                SET s.owner_user_id = u.id
                WHERE s.owner_user_id IS NULL
                """
            );
            if (linkedByEmail > 0) {
                logger.info("Salon-owner link migration: backfilled {} salon rows from matching email", linkedByEmail);
            }

            Integer duplicateOwners = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM (SELECT owner_user_id FROM salons WHERE owner_user_id IS NOT NULL GROUP BY owner_user_id HAVING COUNT(*) > 1) d",
                Integer.class
            );

            Integer hasOwnerUnique = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'salons' AND index_name = 'uk_salons_owner_user_id'",
                Integer.class
            );

            if ((hasOwnerUnique == null || hasOwnerUnique == 0) && (duplicateOwners == null || duplicateOwners == 0)) {
                jdbcTemplate.execute("ALTER TABLE salons ADD CONSTRAINT uk_salons_owner_user_id UNIQUE (owner_user_id)");
                logger.info("Salon-owner link migration: added unique key uk_salons_owner_user_id");
            }

            Integer hasOwnerFk = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND table_name = 'salons' AND column_name = 'owner_user_id' AND referenced_table_name = 'users' AND referenced_column_name = 'id'",
                Integer.class
            );

            if (hasOwnerFk == null || hasOwnerFk == 0) {
                jdbcTemplate.execute("ALTER TABLE salons ADD CONSTRAINT fk_salons_owner_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL");
                logger.info("Salon-owner link migration: added foreign key fk_salons_owner_user");
            }
        } catch (Exception ex) {
            logger.warn("Salon-owner link migration skipped due to error: {}", ex.getMessage());
        }
    }
}
