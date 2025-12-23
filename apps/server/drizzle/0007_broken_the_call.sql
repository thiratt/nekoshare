ALTER TABLE `device` RENAME COLUMN `platform` TO `os`;--> statement-breakpoint
ALTER TABLE `device` ADD `os_version` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `device` ADD `os_long_version` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `device` ADD `is_tailscale` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `device` ADD `ipv6` text;