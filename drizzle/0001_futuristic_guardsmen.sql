CREATE TABLE `temari_lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`subject` enum('Amharic','Math','English','Science') NOT NULL,
	`grade_level` varchar(50) NOT NULL,
	`question` text NOT NULL,
	`options` json NOT NULL,
	`correct_answer` varchar(150) NOT NULL,
	`pronunciation_word` varchar(150),
	`reward_coins` int NOT NULL DEFAULT 15,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `temari_lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `temari_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`lesson_id` int NOT NULL,
	`score` int NOT NULL,
	`completed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `temari_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `temari_progress_student_lesson_uq` UNIQUE(`student_id`,`lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `temari_sponsorships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sponsor_name` varchar(100) NOT NULL,
	`email` varchar(100),
	`phone_number` varchar(20),
	`amount_etb` decimal(10,2) NOT NULL DEFAULT '50.00',
	`student_id` int,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`tx_ref` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `temari_sponsorships_id` PRIMARY KEY(`id`),
	CONSTRAINT `temari_sponsorships_tx_ref_unique` UNIQUE(`tx_ref`)
);
--> statement-breakpoint
CREATE TABLE `temari_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`full_name` varchar(100) NOT NULL,
	`email` varchar(100) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('student','teacher','admin') NOT NULL DEFAULT 'student',
	`grade_level` varchar(20) NOT NULL DEFAULT 'Grade 1',
	`coins` int NOT NULL DEFAULT 50,
	`streak` int NOT NULL DEFAULT 1,
	`registered_by_teacher_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `temari_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `temari_users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `temari_progress` ADD CONSTRAINT `temari_progress_student_id_temari_users_id_fk` FOREIGN KEY (`student_id`) REFERENCES `temari_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `temari_progress` ADD CONSTRAINT `temari_progress_lesson_id_temari_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `temari_lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `temari_sponsorships` ADD CONSTRAINT `temari_sponsorships_student_id_temari_users_id_fk` FOREIGN KEY (`student_id`) REFERENCES `temari_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `temari_users` ADD CONSTRAINT `temari_users_registered_by_teacher_id_temari_users_id_fk` FOREIGN KEY (`registered_by_teacher_id`) REFERENCES `temari_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `temari_lessons_grade_subject_idx` ON `temari_lessons` (`grade_level`,`subject`);--> statement-breakpoint
CREATE INDEX `temari_sponsorships_status_idx` ON `temari_sponsorships` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `temari_users_role_coins_idx` ON `temari_users` (`role`,`coins`);