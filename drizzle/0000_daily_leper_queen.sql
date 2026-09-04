CREATE TABLE `app_states` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploaded_files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uploaded_files_object_key_unique` ON `uploaded_files` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_uploaded_files_user_id` ON `uploaded_files` (`user_id`);