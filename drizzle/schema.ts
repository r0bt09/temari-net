import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Platform-owned OAuth identities remain intact; TEMARI accounts are isolated in their own tables. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const temariUsers = mysqlTable("temari_users", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["student", "teacher", "admin"]).default("student").notNull(),
  gradeLevel: varchar("grade_level", { length: 20 }).default("Grade 1").notNull(),
  coins: int("coins").default(50).notNull(),
  streak: int("streak").default(1).notNull(),
  registeredByTeacherId: int("registered_by_teacher_id").references((): AnyMySqlColumn => temariUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("temari_users_email_uq").on(table.email), index("temari_users_role_coins_idx").on(table.role, table.coins)]);

export const temariLessons = mysqlTable("temari_lessons", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  subject: mysqlEnum("subject", ["Amharic", "Math", "English", "Science"]).notNull(),
  gradeLevel: varchar("grade_level", { length: 50 }).notNull(),
  question: text("question").notNull(),
  options: json("options").$type<string[]>().notNull(),
  correctAnswer: varchar("correct_answer", { length: 150 }).notNull(),
  pronunciationWord: varchar("pronunciation_word", { length: 150 }),
  rewardCoins: int("reward_coins").default(15).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("temari_lessons_grade_subject_idx").on(table.gradeLevel, table.subject)]);

export const temariProgress = mysqlTable("temari_progress", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull().references(() => temariUsers.id, { onDelete: "cascade" }),
  lessonId: int("lesson_id").notNull().references(() => temariLessons.id, { onDelete: "cascade" }),
  score: int("score").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("temari_progress_student_lesson_uq").on(table.studentId, table.lessonId)]);

export const temariSponsorships = mysqlTable("temari_sponsorships", {
  id: int("id").autoincrement().primaryKey(),
  sponsorName: varchar("sponsor_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  amountEtb: decimal("amount_etb", { precision: 10, scale: 2 }).default("50.00").notNull(),
  studentId: int("student_id").references(() => temariUsers.id, { onDelete: "set null" }),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  txRef: varchar("tx_ref", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("temari_sponsorships_status_idx").on(table.status, table.createdAt)]);

export type TemariUser = typeof temariUsers.$inferSelect;
export type TemariLesson = typeof temariLessons.$inferSelect;
export type TemariProgress = typeof temariProgress.$inferSelect;
export type TemariSponsorship = typeof temariSponsorships.$inferSelect;
