import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as AppleAuthentication from "expo-apple-authentication";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { analytics } from "@/lib/analytics";
import type { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "SaveGate">;
type SaveGateRouteProp = RouteProp<OnboardingStackParamList, "SaveGate">;

export default function SaveGateModal() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SaveGateRouteProp>();
  const { loginWithAppleCredentials, loginDemo } = useAuth();
  const { completeSave } = useOnboardingStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      handleDemoSignIn("apple");
      return;
    }

    setIsLoading(true);
    setLoadingMethod("apple");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.authStarted("apple");

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      await loginWithAppleCredentials(credential);
      analytics.authCompleted("apple");
      handleSaveSuccess();
    } catch (error: any) {
      if (error.code !== "ERR_REQUEST_CANCELED") {
        console.error("Apple Sign-In error:", error);
      }
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  };

  const handleGoogleSignIn = async () => {
    handleDemoSignIn("google");
  };

  const handleEmailSignIn = async () => {
    handleDemoSignIn("email");
  };

  const handleDemoSignIn = async (method: "apple" | "google" | "email") => {
    setIsLoading(true);
    setLoadingMethod(method);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.authStarted(method);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await loginDemo();
      analytics.authCompleted(method);
      handleSaveSuccess();
    } catch (error) {
      console.error("Sign-in error:", error);
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  };

  const handleSaveSuccess = () => {
    analytics.mealSaved();
    completeSave();
    navigation.navigate("NotificationsPermission");
  };

  const handleNotNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.onboardingCtaTapped("SaveGateModal", "not_now");
    navigation.goBack();
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.headerSection}>
          <Pressable
            style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleNotNow}
            accessibilityLabel="Close"
          >
            <Feather name="x" size={24} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.heroSection}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="bookmark" size={40} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.title}>
            Save this scan?
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Create a free account to keep history and see trends.
          </ThemedText>
        </View>

        <View style={styles.authSection}>
          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={BorderRadius.md}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          {Platform.OS !== "ios" && (
            <Pressable
              style={({ pressed }) => [
                styles.authButton,
                { backgroundColor: "#000", opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleAppleSignIn}
              disabled={isLoading}
            >
              {loadingMethod === "apple" ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="smartphone" size={20} color="#FFF" />
                  <ThemedText type="headline" style={styles.authButtonText}>
                    Continue with Apple
                  </ThemedText>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.authButton,
              {
                backgroundColor: theme.cardBackground,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {loadingMethod === "google" ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <>
                <ThemedText type="h4" style={{ color: "#4285F4" }}>
                  G
                </ThemedText>
                <ThemedText type="headline">Continue with Google</ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.authButton,
              {
                backgroundColor: theme.cardBackground,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleEmailSignIn}
            disabled={isLoading}
          >
            {loadingMethod === "email" ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <>
                <Feather name="mail" size={20} color={theme.text} />
                <ThemedText type="headline">Continue with Email</ThemedText>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.footerSection}>
          <ThemedText type="caption" style={[styles.privacyText, { color: theme.textSecondary }]}>
            We don't sell personal data.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [styles.notNowButton, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleNotNow}
          >
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Not now
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
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Spacing["3xl"],
  },
  iconContainer: {
    width: 80,
    height: 80,
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
  authSection: {
    gap: Spacing.md,
  },
  appleButton: {
    height: Spacing.buttonHeight,
    width: "100%",
  },
  authButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  authButtonText: {
    color: "#FFFFFF",
  },
  footerSection: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  privacyText: {
    textAlign: "center",
  },
  notNowButton: {
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
});
