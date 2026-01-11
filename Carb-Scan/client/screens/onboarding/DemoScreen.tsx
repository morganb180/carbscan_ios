import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { analytics } from "@/lib/analytics";
import type { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Demo">;

const DEMO_STEPS = [
  { icon: "camera" as const, text: "Point at your meal" },
  { icon: "zap" as const, text: "Snap a photo" },
  { icon: "check-circle" as const, text: "Get carb estimate" },
];

export default function DemoScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const stepOpacity = useSharedValue(1);
  const stepScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    analytics.onboardingViewedScreen("DemoScreen");
    startDemo();
  }, []);

  const advanceStep = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const startDemo = () => {
    const stepDuration = 1500;
    const totalDuration = stepDuration * DEMO_STEPS.length;

    progressWidth.value = withTiming(100, {
      duration: totalDuration,
      easing: Easing.linear,
    });

    DEMO_STEPS.forEach((_, index) => {
      if (index > 0) {
        setTimeout(() => {
          stepOpacity.value = withSequence(
            withTiming(0, { duration: 150 }),
            withTiming(1, { duration: 150 })
          );
          stepScale.value = withSequence(
            withTiming(0.8, { duration: 150 }),
            withTiming(1, { duration: 150 })
          );
          runOnJS(advanceStep)();
        }, index * stepDuration);
      }
    });

    setTimeout(() => {
      runOnJS(setIsComplete)(true);
    }, totalDuration);
  };

  const handleTryNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.onboardingCtaTapped("DemoScreen", "try_now");
    navigation.navigate("Camera");
  };

  const handleUseSample = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.onboardingCtaTapped("DemoScreen", "use_sample");
    navigation.navigate("Results", { useSample: true });
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.onboardingCtaTapped("DemoScreen", "skip");
    navigation.goBack();
  };

  const stepStyle = useAnimatedStyle(() => ({
    opacity: stepOpacity.value,
    transform: [{ scale: stepScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const currentStepData = DEMO_STEPS[currentStep];

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
        <View style={styles.header}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Quick Demo
          </ThemedText>
          <Pressable
            style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleSkip}
          >
            <ThemedText type="body" style={{ color: theme.primary }}>
              Skip
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.demoSection}>
          <Animated.View style={[styles.stepContainer, stepStyle]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
              <Feather name={currentStepData.icon} size={64} color={theme.primary} />
            </View>
            <ThemedText type="h2" style={styles.stepText}>
              {currentStepData.text}
            </ThemedText>
          </Animated.View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <Animated.View
                style={[styles.progressBar, { backgroundColor: theme.primary }, progressStyle]}
              />
            </View>
            <View style={styles.stepsIndicator}>
              {DEMO_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor:
                        index <= currentStep ? theme.primary : theme.border,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {isComplete && (
          <View style={styles.ctaSection}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleTryNow}
              accessibilityRole="button"
              accessibilityLabel="Try it now"
            >
              <Feather name="camera" size={20} color="#FFFFFF" />
              <ThemedText type="headline" style={styles.primaryButtonText}>
                Try it now
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleUseSample}
              accessibilityRole="button"
              accessibilityLabel="Use sample photo"
            >
              <Feather name="image" size={18} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.primary }}>
                Use sample photo instead
              </ThemedText>
            </Pressable>
          </View>
        )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    justifyContent: "center",
  },
  demoSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepContainer: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius["2xl"],
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: {
    textAlign: "center",
    maxWidth: 280,
  },
  progressContainer: {
    width: "100%",
    marginTop: Spacing["3xl"],
    gap: Spacing.lg,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  stepsIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
});
