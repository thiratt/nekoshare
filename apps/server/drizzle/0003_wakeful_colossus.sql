ALTER TABLE `device` RENAME COLUMN `user_id` TO `session_id`;--> statement-breakpoint
ALTER TABLE `device` DROP FOREIGN KEY `device_user_id_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE cascade ON UPDATE no action;