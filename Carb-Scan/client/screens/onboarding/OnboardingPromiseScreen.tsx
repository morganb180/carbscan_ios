import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { FoodIllustration } from "@/components/FoodIllustration";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { analytics } from "@/lib/analytics";
import type { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Promise">;

export default function OnboardingPromiseScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { startOnboarding } = useOnboardingStore();

  const illustrationOpacity = useSharedValue(0);
  const illustrationTranslateY = useSharedValue(10);
  const headlineOpacity = useSharedValue(0);
  const headlineTranslateY = useSharedValue(10);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslateY = useSharedValue(10);
  const trustOpacity = useSharedValue(0);

  useEffect(() => {
    startOnboarding();
    analytics.screenViewed("Welcome");
    analytics.track("welcome_viewed");

    illustrationOpacity.value = withDelay(
      100,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    illustrationTranslateY.value = withDelay(
      100,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    headlineOpacity.value = withDelay(
      250,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    headlineTranslateY.value = withDelay(
      250,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    ctaOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    ctaTranslateY.value = withDelay(
      400,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    trustOpacity.value = withDelay(
      550,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const handleScanMeal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.ctaTapped("scan_meal", "Welcome");
    analytics.track("welcome_cta_tapped");
    navigation.navigate("Camera");
  }, [navigation]);

  const illustrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
    transform: [{ translateY: illustrationTranslateY.value }],
  }));

  const headlineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslateY.value }],
  }));

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }],
  }));

  const trustAnimatedStyle = useAnimatedStyle(() => ({
    opacity: trustOpacity.value,
  }));

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.screenBg }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.illustrationSection}>
          <Animated.View style={illustrationAnimatedStyle}>
            <FoodIllustration size={180} strokeWidth={1.5} />
          </Animated.View>
        </View>

        <View style={styles.brandSection}>
          <Animated.View style={headlineAnimatedStyle}>
            <ThemedText
              style={[styles.headline, { color: theme.textPrimary }]}
              accessibilityRole="header"
            >
              Understand carbs as easily as taking a photo.
            </ThemedText>
          </Animated.View>
        </View>

        <View style={styles.ctaSection}>
          <Animated.View style={ctaAnimatedStyle}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: pressed
                    ? theme.primaryCtaBgPressed
                    : theme.primaryCtaBg,
                },
              ]}
              onPress={handleScanMeal}
              accessibilityLabel="Scan a meal"
              accessibilityHint="Opens camera to take a photo of your food"
              accessibilityRole="button"
            >
              <ThemedText style={[styles.buttonText, { color: theme.textOnAccent }]}>
                Scan a meal
              </ThemedText>
            </Pressable>
          </Animated.View>

          <Animated.View style={trustAnimatedStyle}>
            <ThemedText style={[styles.trustLine, { color: theme.textTertiary }]}>
              No account needed to try.
            </ThemedText>
          </Animated.View>
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
    paddingHorizontal: Spacing.screenPaddingHorizontal,
  },
  illustrationSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  brandSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  headline: {
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 32,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  ctaSection: {
    gap: Spacing.lg,
    alignItems: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    width: "100%",
    height: 56,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    ...Typography.button,
    fontSize: 17,
  },
  trustLine: {
    ...Typography.caption,
    textAlign: "center",
  },
});
