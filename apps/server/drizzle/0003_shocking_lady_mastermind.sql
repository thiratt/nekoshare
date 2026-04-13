CREATE INDEX `friends_user_low_status_idx` ON `friends` (`user_low_id`,`status`);--> statement-breakpoint
CREATE INDEX `friends_user_high_status_idx` ON `friends` (`user_high_id`,`status`);