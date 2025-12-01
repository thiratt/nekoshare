CREATE TABLE `device` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`platform` enum('android','windows','web','other') NOT NULL,
	`public_key` text NOT NULL,
	`battery_supported` boolean NOT NULL DEFAULT false,
	`battery_charging` boolean NOT NULL DEFAULT false,
	`battery_percent` bigint NOT NULL DEFAULT 100,
	`last_ip` text,
	`last_active_at` timestamp DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flash_share` (
	`id` varchar(36) NOT NULL,
	`uploader_id` varchar(36) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` bigint NOT NULL,
	`mime_type` varchar(100),
	`storage_key` text NOT NULL,
	`download_count` bigint DEFAULT 0,
	`max_downloads` bigint,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flash_share_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `friendship` (
	`id` varchar(36) NOT NULL,
	`requester_id` varchar(36) NOT NULL,
	`receiver_id` varchar(36) NOT NULL,
	`status` enum('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendship_id` PRIMARY KEY(`id`),
	CONSTRAINT `friendship_unique_pair` UNIQUE(`requester_id`,`receiver_id`)
);
--> statement-breakpoint
CREATE TABLE `notification` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` enum('security_alert','friend_request','incoming_share','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`is_read` boolean NOT NULL DEFAULT false,
	`related_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transfer_history` (
	`id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`receiver_id` varchar(36),
	`file_name` varchar(255) NOT NULL,
	`file_size` bigint NOT NULL,
	`transfer_method` enum('local','relay','flash_share') NOT NULL,
	`status` enum('completed','failed','cancelled','expired') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transfer_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preference` (
	`user_id` varchar(36) NOT NULL,
	`theme` enum('light','dark','system') NOT NULL DEFAULT 'system',
	`language` enum('en','th') NOT NULL DEFAULT 'en',
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preference_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flash_share` ADD CONSTRAINT `flash_share_uploader_id_user_id_fk` FOREIGN KEY (`uploader_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friendship` ADD CONSTRAINT `friendship_requester_id_user_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friendship` ADD CONSTRAINT `friendship_receiver_id_user_id_fk` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfer_history` ADD CONSTRAINT `transfer_history_sender_id_user_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preference` ADD CONSTRAINT `user_preference_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;