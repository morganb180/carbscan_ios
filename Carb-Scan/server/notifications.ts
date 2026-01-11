import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from "expo-server-sdk";
import { storage } from "./storage";
import type { NotificationMessage, DeviceRegistration } from "@shared/schema";

const expo = new Expo();

interface SendResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

export async function sendPushNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  targetUserIds?: string[]
): Promise<SendResult> {
  let devices: DeviceRegistration[];
  
  if (targetUserIds && targetUserIds.length > 0) {
    const allDevices = await Promise.all(
      targetUserIds.map(userId => storage.getDevicesForUser(userId))
    );
    devices = allDevices.flat();
  } else {
    devices = await storage.getEnabledDevices();
  }

  if (devices.length === 0) {
    return { successCount: 0, failureCount: 0, errors: ["No registered devices found"] };
  }

  const messages: ExpoPushMessage[] = [];
  const validDevices: DeviceRegistration[] = [];

  for (const device of devices) {
    if (!Expo.isExpoPushToken(device.expoPushToken)) {
      console.warn(`Invalid Expo push token: ${device.expoPushToken}`);
      continue;
    }

    messages.push({
      to: device.expoPushToken,
      sound: "default",
      title,
      body,
      data: data || {},
    });
    validDevices.push(device);
  }

  if (messages.length === 0) {
    return { successCount: 0, failureCount: devices.length, errors: ["No valid push tokens found"] };
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Error sending push notification chunk:", error);
      errors.push(String(error));
      failureCount += chunk.length;
    }
  }

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const device = validDevices[i];

    if (ticket.status === "ok") {
      successCount++;
      await storage.updateDeviceLastNotified(device.id);
    } else {
      failureCount++;
      if (ticket.details?.error) {
        errors.push(`${device.expoPushToken}: ${ticket.details.error}`);
        
        if (ticket.details.error === "DeviceNotRegistered") {
          await storage.unregisterDevice(device.expoPushToken);
        }
      }
    }
  }

  return { successCount, failureCount, errors };
}

export async function sendNotificationMessage(messageId: string): Promise<SendResult> {
  const message = await storage.getNotificationMessage(messageId);
  
  if (!message) {
    return { successCount: 0, failureCount: 0, errors: ["Notification message not found"] };
  }

  if (message.status !== "pending") {
    return { successCount: 0, failureCount: 0, errors: [`Message already ${message.status}`] };
  }

  await storage.updateNotificationStatus(messageId, "sending");

  const data = message.data ? JSON.parse(message.data) : undefined;
  const result = await sendPushNotification(message.title, message.body, data);

  await storage.updateNotificationStatus(
    messageId, 
    "sent", 
    result.successCount, 
    result.failureCount
  );

  return result;
}

export async function processPendingNotifications(): Promise<void> {
  const pending = await storage.getPendingNotifications();
  
  for (const message of pending) {
    try {
      await sendNotificationMessage(message.id);
    } catch (error) {
      console.error(`Failed to send notification ${message.id}:`, error);
      await storage.updateNotificationStatus(message.id, "failed");
    }
  }
}
