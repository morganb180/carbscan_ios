import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const deviceRegistrations = pgTable("device_registrations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  expoPushToken: text("expo_push_token").notNull().unique(),
  platform: varchar("platform", { length: 20 }).notNull(),
  deviceModel: text("device_model"),
  osVersion: text("os_version"),
  appVersion: text("app_version"),
  enabled: boolean("enabled").notNull().default(true),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deviceRegistrationsRelations = relations(deviceRegistrations, ({ one }) => ({
  user: one(users, {
    fields: [deviceRegistrations.userId],
    references: [users.id],
  }),
}));

export const insertDeviceRegistrationSchema = createInsertSchema(deviceRegistrations).pick({
  userId: true,
  expoPushToken: true,
  platform: true,
  deviceModel: true,
  osVersion: true,
  appVersion: true,
});

export type InsertDeviceRegistration = z.infer<typeof insertDeviceRegistrationSchema>;
export type DeviceRegistration = typeof deviceRegistrations.$inferSelect;

export const notificationMessages = pgTable("notification_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: text("data"),
  category: varchar("category", { length: 50 }),
  audienceType: varchar("audience_type", { length: 20 }).notNull().default("all"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdBy: varchar("created_by"),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNotificationMessageSchema = createInsertSchema(notificationMessages).pick({
  title: true,
  body: true,
  data: true,
  category: true,
  audienceType: true,
  scheduledFor: true,
  createdBy: true,
});

export type InsertNotificationMessage = z.infer<typeof insertNotificationMessageSchema>;
export type NotificationMessage = typeof notificationMessages.$inferSelect;
