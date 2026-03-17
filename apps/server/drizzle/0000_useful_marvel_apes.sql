CREATE TABLE `accounts` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password_hash` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`username` varchar(255),
	`display_username` text,
	`role` enum('admin','user') NOT NULL DEFAULT 'user',
	`last_active_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`current_session_id` varchar(36),
	`device_name` varchar(50) NOT NULL,
	`platform` enum('windows','android','web','other') NOT NULL,
	`fcm_token_latest` varchar(255),
	`fingerprint` varchar(128),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `devices_user_fingerprint_unique` UNIQUE(`user_id`,`fingerprint`)
);
--> statement-breakpoint
CREATE TABLE `public_share` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(50) NOT NULL,
	`url` varchar(36) NOT NULL,
	`password_hash` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`expires_at` timestamp(3) NOT NULL,
	CONSTRAINT `public_share_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_share_url_unique` UNIQUE(`url`)
);
--> statement-breakpoint
CREATE TABLE `friends` (
	`id` varchar(36) NOT NULL,
	`user_low_id` varchar(36) NOT NULL,
	`user_high_id` varchar(36) NOT NULL,
	`requested_by_user_id` varchar(36) NOT NULL,
	`blocked_by_user_id` varchar(36),
	`status` enum('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `friends_id` PRIMARY KEY(`id`),
	CONSTRAINT `friends_user_pair_unique` UNIQUE(`user_low_id`,`user_high_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`actor_user_id` varchar(36),
	`type` varchar(100) NOT NULL,
	`i18n_key` varchar(255) NOT NULL,
	`params` text,
	`read_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_share_files` (
	`id` varchar(36) NOT NULL,
	`public_share_id` varchar(36) NOT NULL,
	`storage_key` text NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` bigint NOT NULL,
	`mime_type` varchar(50) NOT NULL,
	CONSTRAINT `public_share_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transfer_metrics` (
	`id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`transfer_method` enum('local','relay','flash_share') NOT NULL,
	`file_size` bigint NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `transfer_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` varchar(36) NOT NULL,
	`theme` enum('light','dark','system') NOT NULL DEFAULT 'system',
	`language` enum('en','th') NOT NULL DEFAULT 'th',
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_settings_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_current_session_id_sessions_id_fk` FOREIGN KEY (`current_session_id`) REFERENCES `sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `public_share` ADD CONSTRAINT `public_share_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friends` ADD CONSTRAINT `friends_user_low_id_users_id_fk` FOREIGN KEY (`user_low_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friends` ADD CONSTRAINT `friends_user_high_id_users_id_fk` FOREIGN KEY (`user_high_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friends` ADD CONSTRAINT `friends_requested_by_user_id_users_id_fk` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friends` ADD CONSTRAINT `friends_blocked_by_user_id_users_id_fk` FOREIGN KEY (`blocked_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `public_share_files` ADD CONSTRAINT `public_share_files_public_share_id_public_share_id_fk` FOREIGN KEY (`public_share_id`) REFERENCES `public_share`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfer_metrics` ADD CONSTRAINT `transfer_metrics_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_userId_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_userId_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `devices_user_id_idx` ON `devices` (`user_id`);--> statement-breakpoint
CREATE INDEX `devices_current_session_id_idx` ON `devices` (`current_session_id`);--> statement-breakpoint
CREATE INDEX `public_share_user_id_idx` ON `public_share` (`user_id`);--> statement-breakpoint
CREATE INDEX `friends_requested_by_user_id_idx` ON `friends` (`requested_by_user_id`);--> statement-breakpoint
CREATE INDEX `friends_blocked_by_user_id_idx` ON `friends` (`blocked_by_user_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_actor_user_id_idx` ON `notifications` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `notifications_read_at_idx` ON `notifications` (`read_at`);--> statement-breakpoint
CREATE INDEX `public_share_files_public_share_id_idx` ON `public_share_files` (`public_share_id`);--> statement-breakpoint
CREATE INDEX `transfer_metrics_sender_id_idx` ON `transfer_metrics` (`sender_id`);