DROP TABLE `verification`;--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `access_token`;--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `refresh_token`;--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `id_token`;--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `access_token_expires_at`;--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `refresh_token_expires_at`;--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `scope`;