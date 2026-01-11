import { 
  users, 
  deviceRegistrations, 
  notificationMessages,
  type User, 
  type InsertUser,
  type DeviceRegistration,
  type InsertDeviceRegistration,
  type NotificationMessage,
  type InsertNotificationMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, isNull, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  registerDevice(registration: InsertDeviceRegistration): Promise<DeviceRegistration>;
  unregisterDevice(expoPushToken: string): Promise<boolean>;
  getDeviceByToken(expoPushToken: string): Promise<DeviceRegistration | undefined>;
  getDevicesForUser(userId: string): Promise<DeviceRegistration[]>;
  getEnabledDevices(): Promise<DeviceRegistration[]>;
  updateDeviceLastNotified(id: string): Promise<void>;

  createNotificationMessage(message: InsertNotificationMessage): Promise<NotificationMessage>;
  getNotificationMessage(id: string): Promise<NotificationMessage | undefined>;
  getPendingNotifications(): Promise<NotificationMessage[]>;
  updateNotificationStatus(id: string, status: string, successCount?: number, failureCount?: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async registerDevice(registration: InsertDeviceRegistration): Promise<DeviceRegistration> {
    const existing = await this.getDeviceByToken(registration.expoPushToken);
    
    if (existing) {
      const [updated] = await db
        .update(deviceRegistrations)
        .set({
          userId: registration.userId,
          platform: registration.platform,
          deviceModel: registration.deviceModel,
          osVersion: registration.osVersion,
          appVersion: registration.appVersion,
          enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(deviceRegistrations.expoPushToken, registration.expoPushToken))
        .returning();
      return updated;
    }

    const [device] = await db
      .insert(deviceRegistrations)
      .values(registration)
      .returning();
    return device;
  }

  async unregisterDevice(expoPushToken: string): Promise<boolean> {
    const result = await db
      .update(deviceRegistrations)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(deviceRegistrations.expoPushToken, expoPushToken));
    return true;
  }

  async getDeviceByToken(expoPushToken: string): Promise<DeviceRegistration | undefined> {
    const [device] = await db
      .select()
      .from(deviceRegistrations)
      .where(eq(deviceRegistrations.expoPushToken, expoPushToken));
    return device || undefined;
  }

  async getDevicesForUser(userId: string): Promise<DeviceRegistration[]> {
    return db
      .select()
      .from(deviceRegistrations)
      .where(and(
        eq(deviceRegistrations.userId, userId),
        eq(deviceRegistrations.enabled, true)
      ));
  }

  async getEnabledDevices(): Promise<DeviceRegistration[]> {
    return db
      .select()
      .from(deviceRegistrations)
      .where(eq(deviceRegistrations.enabled, true));
  }

  async updateDeviceLastNotified(id: string): Promise<void> {
    await db
      .update(deviceRegistrations)
      .set({ lastNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(deviceRegistrations.id, id));
  }

  async createNotificationMessage(message: InsertNotificationMessage): Promise<NotificationMessage> {
    const [notification] = await db
      .insert(notificationMessages)
      .values(message)
      .returning();
    return notification;
  }

  async getNotificationMessage(id: string): Promise<NotificationMessage | undefined> {
    const [message] = await db
      .select()
      .from(notificationMessages)
      .where(eq(notificationMessages.id, id));
    return message || undefined;
  }

  async getPendingNotifications(): Promise<NotificationMessage[]> {
    const now = new Date();
    return db
      .select()
      .from(notificationMessages)
      .where(and(
        eq(notificationMessages.status, "pending"),
        or(
          isNull(notificationMessages.scheduledFor),
          lte(notificationMessages.scheduledFor, now)
        )
      ));
  }

  async updateNotificationStatus(
    id: string, 
    status: string, 
    successCount?: number, 
    failureCount?: number
  ): Promise<void> {
    const updates: Record<string, any> = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (status === "sent") {
      updates.sentAt = new Date();
    }
    if (successCount !== undefined) {
      updates.successCount = successCount;
    }
    if (failureCount !== undefined) {
      updates.failureCount = failureCount;
    }

    await db
      .update(notificationMessages)
      .set(updates)
      .where(eq(notificationMessages.id, id));
  }
}

export const storage = new DatabaseStorage();
