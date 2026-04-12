ALTER TABLE `users` ADD `theme` enum('light','dark','system') DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `language` enum('en','th') DEFAULT 'th' NOT NULL;--> statement-breakpoint
UPDATE `users`
LEFT JOIN `user_settings` ON `user_settings`.`user_id` = `users`.`id`
SET
	`users`.`theme` = COALESCE(`user_settings`.`theme`, `users`.`theme`),
	`users`.`language` = COALESCE(`user_settings`.`language`, `users`.`language`)
WHERE `user_settings`.`user_id` IS NOT NULL;--> statement-breakpoint
DROP TABLE `user_settings`;
