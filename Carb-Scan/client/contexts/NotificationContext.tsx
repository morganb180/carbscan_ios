import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  registerForPushNotifications,
  unregisterDevice,
  checkNotificationPermissions,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  setBadgeCount,
} from "@/lib/notifications";
import { useAuth } from "./AuthContext";

const PUSH_TOKEN_KEY = "carbscan_push_token";
const NOTIFICATIONS_ENABLED_KEY = "carbscan_notifications_enabled";

interface NotificationContextType {
  isEnabled: boolean;
  pushToken: string | null;
  hasPermission: boolean;
  isLoading: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  lastNotification: Notifications.Notification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);

  useEffect(() => {
    loadNotificationState();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const receivedSubscription = addNotificationReceivedListener((notification) => {
      setLastNotification(notification);
    });

    const responseSubscription = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationResponse(data);
    });

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const updateRegistration = async () => {
      if (isAuthenticated && user?.id && isEnabled && pushToken) {
        const newToken = await registerForPushNotifications(user.id);
        if (newToken && newToken !== pushToken) {
          setPushToken(newToken);
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, newToken);
        }
      }
    };
    updateRegistration();
  }, [isAuthenticated, user?.id, isEnabled, pushToken]);

  const loadNotificationState = async () => {
    try {
      const [savedToken, savedEnabled] = await Promise.all([
        AsyncStorage.getItem(PUSH_TOKEN_KEY),
        AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY),
      ]);

      if (savedToken) {
        setPushToken(savedToken);
      }

      if (savedEnabled === "true") {
        setIsEnabled(true);
      }

      const permissionGranted = await checkNotificationPermissions();
      setHasPermission(permissionGranted);

      if (savedEnabled === "true" && !permissionGranted) {
        setIsEnabled(false);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
      }
    } catch (error) {
      console.error("Error loading notification state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      const permissionGranted = await checkNotificationPermissions();
      setHasPermission(permissionGranted);
      
      if (!permissionGranted && isEnabled) {
        setIsEnabled(false);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
      }

      await setBadgeCount(0);
    }
  };

  const handleNotificationResponse = (data: Record<string, unknown>) => {
    console.log("Notification tapped with data:", data);
  };

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user?.id) {
      console.log("User not authenticated, cannot enable notifications");
      return false;
    }

    setIsLoading(true);
    try {
      const token = await registerForPushNotifications(user.id);
      
      if (token) {
        setPushToken(token);
        setIsEnabled(true);
        setHasPermission(true);
        
        await Promise.all([
          AsyncStorage.setItem(PUSH_TOKEN_KEY, token),
          AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true"),
        ]);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error enabling notifications:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const disableNotifications = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (pushToken) {
        await unregisterDevice(pushToken);
      }
      
      setIsEnabled(false);
      setPushToken(null);
      
      await Promise.all([
        AsyncStorage.removeItem(PUSH_TOKEN_KEY),
        AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false"),
      ]);
    } catch (error) {
      console.error("Error disabling notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pushToken]);

  const contextValue = useMemo(
    () => ({
      isEnabled,
      pushToken,
      hasPermission,
      isLoading,
      enableNotifications,
      disableNotifications,
      lastNotification,
    }),
    [isEnabled, pushToken, hasPermission, isLoading, enableNotifications, disableNotifications, lastNotification]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
