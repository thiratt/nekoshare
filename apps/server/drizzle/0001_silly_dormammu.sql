ALTER TABLE `accounts` MODIFY COLUMN `provider_id` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` MODIFY COLUMN `account_id` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_provider_account_uidx` UNIQUE(`provider_id`,`account_id`);
