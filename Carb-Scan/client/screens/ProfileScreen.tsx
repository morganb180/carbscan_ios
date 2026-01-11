import React from "react";
import { View, StyleSheet, Pressable, Alert, Switch, Platform, Linking, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { clearAllData } from "@/utils/storage";
import { useOnboardingStore } from "@/stores/onboardingStore";

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
}

function SettingsItem({
  icon,
  label,
  value,
  onPress,
  destructive = false,
}: SettingsItemProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsItem,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.settingsItemLeft}>
        <Feather
          name={icon}
          size={20}
          color={destructive ? theme.error : theme.primary}
        />
        <ThemedText
          type="body"
          style={destructive ? { color: theme.error } : undefined}
        >
          {label}
        </ThemedText>
      </View>
      <View style={styles.settingsItemRight}>
        {value ? (
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {value}
          </ThemedText>
        ) : null}
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

function NotificationToggle() {
  const { theme } = useTheme();
  const { isEnabled, isLoading, enableNotifications, disableNotifications } = useNotifications();

  const handleToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const success = await enableNotifications();
      if (!success) {
        Alert.alert(
          "Notifications",
          Platform.OS === "web" 
            ? "Push notifications are not available on web. Try the app on your phone using Expo Go."
            : "Could not enable notifications. Please check your device settings.",
          Platform.OS !== "web" 
            ? [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Open Settings", 
                  onPress: async () => {
                    try {
                      await Linking.openSettings();
                    } catch (error) {
                      console.log("Could not open settings");
                    }
                  }
                },
              ]
            : [{ text: "OK" }]
        );
      }
    } else {
      await disableNotifications();
    }
  };

  return (
    <View style={styles.settingsItem}>
      <View style={styles.settingsItemLeft}>
        <Feather name="bell" size={20} color={theme.primary} />
        <ThemedText type="body">Push Notifications</ThemedText>
      </View>
      <View style={styles.settingsItemRight}>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Switch
            value={isEnabled}
            onValueChange={handleToggle}
            trackColor={{ false: "#767577", true: theme.primary }}
            thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
          />
        )}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, subscription, isAuthenticated, logout } = useAuth();
  const navigation = useNavigation<ProfileNavigationProp>();

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await clearAllData();
          await logout();
        },
      },
    ]);
  };

  const handleOpenChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Chat");
  };

  const handleViewWelcomeScreen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useOnboardingStore.getState().reset();
  };

  const getTierBadgeColor = () => {
    switch (subscription.tier) {
      case "pro":
        return "#FFD700";
      case "essentials":
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  const getTierLabel = () => {
    switch (subscription.tier) {
      case "pro":
        return "Pro";
      case "essentials":
        return "Essentials";
      default:
        return "Free";
    }
  };

  if (!isAuthenticated) {
    return (
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.loginPrompt}>
          <Feather name="user" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.loginTitle}>
            Sign In to CarbScan
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.loginText, { color: theme.textSecondary }]}
          >
            Sign in to sync your meals across devices, access insights, and
            unlock premium features.
          </ThemedText>
          <Button onPress={handleLogin}>Sign In</Button>
        </View>

        <Card elevation={1} style={{ ...styles.settingsCard, marginTop: Spacing.xl }}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Settings
          </ThemedText>
          <SettingsItem
            icon="refresh-cw"
            label="Restart Onboarding"
            onPress={handleViewWelcomeScreen}
          />
        </Card>
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Card elevation={1} style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText type="h2" style={{ color: "#fff" }}>
              {user?.firstName?.charAt(0).toUpperCase() || "U"}
            </ThemedText>
          </View>
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: getTierBadgeColor() },
            ]}
          >
            <ThemedText type="caption" style={{ color: "#fff", fontWeight: "600" }}>
              {getTierLabel()}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="h3" style={styles.userName}>
          {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || "User"}
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {user?.email || ""}
        </ThemedText>
      </Card>

      <Card elevation={1} style={styles.scansCard}>
        <View style={styles.scansHeader}>
          <Feather name="camera" size={24} color={theme.primary} />
          <View style={styles.scansInfo}>
            <ThemedText type="h4">Scans Remaining</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Resets daily
            </ThemedText>
          </View>
          <ThemedText type="h2" style={{ color: theme.primary }}>
            {subscription.scansRemaining}
          </ThemedText>
        </View>
        <View style={styles.scansProgress}>
          <View
            style={[
              styles.scansProgressFill,
              {
                width: `${(subscription.scansRemaining / subscription.scansTotal) * 100}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, textAlign: "center" }}
        >
          {subscription.scansRemaining} of {subscription.scansTotal} scans available
        </ThemedText>
      </Card>

      <Pressable
        onPress={handleOpenChat}
        style={({ pressed }) => [
          styles.chatButton,
          { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Feather name="message-circle" size={24} color="#fff" />
        <View style={styles.chatButtonText}>
          <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
            AI Nutrition Assistant
          </ThemedText>
          <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.8)" }}>
            {subscription.chatLimit} messages remaining today
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.8)" />
      </Pressable>

      <Card elevation={1} style={styles.settingsCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Subscription
        </ThemedText>
        <SettingsItem
          icon="credit-card"
          label="Manage Subscription"
          value={getTierLabel()}
          onPress={() => {}}
        />
        <SettingsItem
          icon="tag"
          label="View Pricing"
          onPress={() => {}}
        />
      </Card>

      <Card elevation={1} style={styles.settingsCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Settings
        </ThemedText>
        <SettingsItem
          icon="globe"
          label="Units"
          value="Grams"
          onPress={() => {}}
        />
        <NotificationToggle />
        <SettingsItem
          icon="help-circle"
          label="Help & Support"
          onPress={() => {}}
        />
        <SettingsItem
          icon="refresh-cw"
          label="View Welcome Screen"
          onPress={handleViewWelcomeScreen}
        />
      </Card>

      <Card elevation={1} style={styles.settingsCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Account
        </ThemedText>
        <SettingsItem
          icon="trash-2"
          label="Delete Account"
          onPress={() => {
            Alert.alert(
              "Delete Account",
              "This action cannot be undone. All your data will be permanently deleted.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => {} },
              ]
            );
          }}
          destructive
        />
      </Card>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Feather name="log-out" size={20} color={theme.error} />
        <ThemedText type="body" style={{ color: theme.error }}>
          Sign Out
        </ThemedText>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loginPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  loginTitle: {
    marginTop: Spacing.lg,
  },
  loginText: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tierBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  userName: {
    marginBottom: Spacing.xs,
  },
  scansCard: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  scansHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  scansInfo: {
    flex: 1,
  },
  scansProgress: {
    height: 8,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    overflow: "hidden",
  },
  scansProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  chatButtonText: {
    flex: 1,
  },
  settingsCard: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
  },
});
