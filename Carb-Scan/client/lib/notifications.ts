import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiUrl } from "./query-client";
import { getAccessToken } from "@/utils/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface DeviceRegistration {
  deviceId: string;
  registered: boolean;
}

export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  if (Platform.OS === "web") {
    console.log("Push notifications not supported on web");
    return null;
  }

  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const expoPushToken = tokenData.data;

    await registerDeviceWithServer(expoPushToken, userId);
    
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#007AFF",
      });
    }

    return expoPushToken;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

export async function registerDeviceWithServer(
  expoPushToken: string,
  userId: string
): Promise<DeviceRegistration | null> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/mobile/v1/devices/register", apiUrl);
    
    const accessToken = await getAccessToken();
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        expoPushToken,
        platform: Platform.OS,
        deviceModel: Device.modelName || "Unknown",
        osVersion: Device.osVersion || "Unknown",
        appVersion: Constants.expoConfig?.version || "1.0.0",
        userId,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      return result.data;
    }
    
    console.error("Device registration failed:", result.error);
    return null;
  } catch (error) {
    console.error("Error registering device:", error);
    return null;
  }
}

export async function unregisterDevice(expoPushToken: string): Promise<boolean> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/mobile/v1/devices/unregister", apiUrl);
    
    const accessToken = await getAccessToken();
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({ expoPushToken }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error unregistering device:", error);
    return false;
  }
}

export async function checkNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function getBadgeCount(): Promise<number> {
  if (Platform.OS === "web") {
    return 0;
  }
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await Notifications.setBadgeCountAsync(count);
}

export async function dismissAllNotifications(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await Notifications.dismissAllNotificationsAsync();
}
