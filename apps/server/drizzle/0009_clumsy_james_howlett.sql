RENAME TABLE `friendship` TO `friend`;--> statement-breakpoint
ALTER TABLE `friend` DROP FOREIGN KEY `friendship_requester_id_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `friend` DROP FOREIGN KEY `friendship_receiver_id_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `friend` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `friend` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `friend` ADD CONSTRAINT `friend_requester_id_user_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friend` ADD CONSTRAINT `friend_receiver_id_user_id_fk` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;