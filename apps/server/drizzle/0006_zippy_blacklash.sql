ALTER TABLE `device` RENAME COLUMN `last_ip` TO `ipv4`;--> statement-breakpoint
ALTER TABLE `device` MODIFY COLUMN `ipv4` text NOT NULL;