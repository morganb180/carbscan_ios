import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, AccessibilityInfo } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Motion } from "@/constants/theme";

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  position?: "top" | "bottom";
}

export function Toast({
  message,
  visible,
  onDismiss,
  actionLabel,
  onAction,
  duration = 5000,
  position = "bottom",
}: ToastProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(position === "bottom" ? 100 : -100);
  const opacity = useSharedValue(0);

  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: Motion.pressFeedback });

      AccessibilityInfo.announceForAccessibility(message);

      const timer = setTimeout(() => {
        runOnJS(dismiss)();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(position === "bottom" ? 100 : -100, {
        duration: Motion.modalSheet,
      });
      opacity.value = withTiming(0, { duration: Motion.pressFeedback });
    }
  }, [visible, duration, position, message, translateY, opacity, dismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction?.();
    onDismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        position === "bottom"
          ? { bottom: insets.bottom + Spacing.s4 }
          : { top: insets.top + Spacing.s4 },
        {
          backgroundColor: theme.text,
          ...Shadows.card,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <ThemedText
        style={[styles.message, { color: theme.textInverse }]}
        numberOfLines={2}
      >
        {message}
      </ThemedText>
      {actionLabel && onAction && (
        <Pressable
          onPress={handleAction}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <ThemedText style={[styles.actionText, { color: theme.accentSoft }]}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.s4,
    right: Spacing.s4,
    borderRadius: BorderRadius.r2,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1000,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  actionButton: {
    marginLeft: Spacing.s3,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s3,
    borderRadius: BorderRadius.r1,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
