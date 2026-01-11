import React, { useState } from "react";
import { View, StyleSheet, Image, Pressable, Platform, ActivityIndicator, Alert, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AuthWebView from "@/components/AuthWebView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { AuthResponse } from "@/utils/api";

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { loginWithAppleCredentials, loginWithReplitTokens, loginDemo } = useAuth();
  const navigation = useNavigation<LoginNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      setShowWebView(true);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const AppleAuthentication = await import("expo-apple-authentication");
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken || !credential.authorizationCode) {
        throw new Error("Apple Sign-In failed: Missing required credentials");
      }

      await loginWithAppleCredentials(
        credential.identityToken,
        credential.authorizationCode,
        {
          email: credential.email || undefined,
          firstName: credential.fullName?.givenName || undefined,
          lastName: credential.fullName?.familyName || undefined,
        }
      );
      
      navigation.goBack();
    } catch (error) {
      console.error("Login failed:", error);
      const message = error instanceof Error ? error.message : "Sign-in failed. Please try again.";
      
      if (message.includes("not configured") || message.includes("Apple Sign In")) {
        Alert.alert(
          "Apple Sign-In Unavailable",
          "Apple Sign-In is currently being set up. Would you like to sign in with Email or Google instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Sign In", onPress: () => setShowWebView(true) }
          ]
        );
      } else {
        Alert.alert("Sign-In Failed", message, [{ text: "OK" }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtherSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWebView(true);
  };

  const handleWebViewSuccess = async (authResponse: AuthResponse) => {
    setShowWebView(false);
    setIsLoading(true);
    
    try {
      await loginWithReplitTokens(authResponse);
      navigation.goBack();
    } catch (error) {
      console.error("Login failed:", error);
      Alert.alert("Sign-In Failed", "Failed to complete sign-in. Please try again.", [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebViewError = (error: string) => {
    setShowWebView(false);
    Alert.alert("Sign-In Failed", error, [{ text: "OK" }]);
  };

  const handleWebViewCancel = () => {
    setShowWebView(false);
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await loginDemo();
      navigation.goBack();
    } catch (error) {
      console.error("Demo login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["3xl"] }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h1" style={styles.appName}>
            CarbScan
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.tagline, { color: theme.textSecondary }]}
          >
            AI-powered carb counting for diabetes management
          </ThemedText>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Feather name="camera" size={24} color={theme.primary} />
            <ThemedText type="body" style={styles.featureText}>
              Scan food to count carbs instantly
            </ThemedText>
          </View>
          <View style={styles.feature}>
            <Feather name="bar-chart-2" size={24} color={theme.primary} />
            <ThemedText type="body" style={styles.featureText}>
              Track your nutrition trends
            </ThemedText>
          </View>
          <View style={styles.feature}>
            <Feather name="message-circle" size={24} color={theme.primary} />
            <ThemedText type="body" style={styles.featureText}>
              Get personalized meal advice
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {Platform.OS === "ios" ? (
          <Pressable
            onPress={handleAppleSignIn}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.appleButton,
              { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.backgroundRoot} />
            ) : (
              <>
                <Feather name="user" size={20} color={theme.backgroundRoot} />
                <ThemedText
                  type="body"
                  style={[styles.buttonText, { color: theme.backgroundRoot }]}
                >
                  Sign in with Apple
                </ThemedText>
              </>
            )}
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleOtherSignIn}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.secondaryButton,
            { 
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isLoading && Platform.OS !== "ios" ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <Feather name="log-in" size={20} color={theme.primary} />
              <ThemedText
                type="body"
                style={[styles.buttonText, { color: theme.text }]}
              >
                {Platform.OS === "ios" ? "Sign in with Email or Google" : "Sign In"}
              </ThemedText>
            </>
          )}
        </Pressable>

        {__DEV__ ? (
          <Pressable
            onPress={handleDemoLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.demoButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary }}
            >
              Continue with Demo Account
            </ThemedText>
          </Pressable>
        ) : null}

        <ThemedText
          type="caption"
          style={[styles.terms, { color: theme.textSecondary }]}
        >
          By signing in, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
      </View>

      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleWebViewCancel}
      >
        <AuthWebView
          onSuccess={handleWebViewSuccess}
          onError={handleWebViewError}
          onCancel={handleWebViewCancel}
        />
      </Modal>
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
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  appName: {
    marginTop: Spacing.lg,
  },
  tagline: {
    textAlign: "center",
    marginTop: Spacing.sm,
    maxWidth: 280,
  },
  featuresContainer: {
    gap: Spacing.lg,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 50,
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  demoButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  buttonText: {
    fontWeight: "600",
  },
  terms: {
    textAlign: "center",
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
});
