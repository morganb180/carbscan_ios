import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { analytics } from "@/lib/analytics";
import type { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "NotificationsPermission">;

const NOTIFICATION_EXAMPLES = [
  { icon: "clock" as const, text: "Don't forget to scan dinner" },
  { icon: "trending-up" as const, text: "You're close to your daily carb goal" },
];

export default function NotificationsPermissionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { setNotificationPermission } = useOnboardingStore();

  useEffect(() => {
    analytics.onboardingViewedScreen("NotificationsPermissionScreen");
  }, []);

  const handleEnableNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.permissionPrompted("notifications");

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      analytics.permissionResult("notifications", status);

      if (status === "granted") {
        setNotificationPermission("granted");
      } else {
        setNotificationPermission("denied");
      }
    } catch (error) {
      console.error("Notification permission error:", error);
      setNotificationPermission("denied");
    }

    finishOnboarding();
  };

  const handleMaybeLater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.onboardingCtaTapped("NotificationsPermissionScreen", "maybe_later");
    finishOnboarding();
  };

  const finishOnboarding = () => {
    navigation.navigate("Home");
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.heroSection}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="bell" size={48} color={theme.primary} />
          </View>

          <ThemedText type="h2" style={styles.title}>
            Want a helpful nudge?
          </ThemedText>

          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            We'll remind you only when it's useful.
          </ThemedText>
        </View>

        <View style={styles.examplesSection}>
          {NOTIFICATION_EXAMPLES.map((example, index) => (
            <Card key={index} style={styles.exampleCard}>
              <View style={styles.exampleContent}>
                <View
                  style={[
                    styles.exampleIconContainer,
                    { backgroundColor: theme.primary + "10" },
                  ]}
                >
                  <Feather name={example.icon} size={20} color={theme.primary} />
                </View>
                <ThemedText type="body" style={styles.exampleText}>
                  {example.text}
                </ThemedText>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.ctaSection}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleEnableNotifications}
            accessibilityRole="button"
            accessibilityLabel="Enable notifications"
          >
            <Feather name="bell" size={20} color="#FFFFFF" />
            <ThemedText type="headline" style={styles.primaryButtonText}>
              Enable notifications
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleMaybeLater}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
          >
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Maybe later
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "space-between",
  },
  heroSection: {
    alignItems: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 280,
  },
  examplesSection: {
    gap: Spacing.md,
  },
  exampleCard: {
    padding: Spacing.lg,
  },
  exampleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  exampleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  exampleText: {
    flex: 1,
  },
  ctaSection: {
    gap: Spacing.md,
  },
  primaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
});
