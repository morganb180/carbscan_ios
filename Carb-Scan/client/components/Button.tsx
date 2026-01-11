import React, { ReactNode } from "react";
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography, Motion } from "@/constants/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "medium" | "large";

interface ButtonProps {
  onPress?: () => void;
  label?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  label,
  children,
  style,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "medium",
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.98, springConfig);
      opacity.value = withSpring(0.9, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, springConfig);
      opacity.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress?.();
    }
  };

  const getBackgroundColor = () => {
    if (disabled || loading) {
      switch (variant) {
        case "primary":
          return theme.accent;
        case "secondary":
          return theme.surfaceAlt;
        case "ghost":
          return "transparent";
        case "destructive":
          return theme.danger;
        default:
          return theme.accent;
      }
    }
    switch (variant) {
      case "primary":
        return theme.primaryCtaBg;
      case "secondary":
        return theme.surfaceAlt;
      case "ghost":
        return "transparent";
      case "destructive":
        return theme.danger;
      default:
        return theme.primaryCtaBg;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return theme.textOnAccent;
      case "secondary":
        return theme.textPrimary;
      case "ghost":
        return theme.accent;
      case "destructive":
        return theme.textOnAccent;
      default:
        return theme.textOnAccent;
    }
  };

  const getBorderStyle = () => {
    if (variant === "secondary") {
      return {
        borderWidth: 1,
        borderColor: theme.border,
      };
    }
    return {};
  };

  const height = size === "large" ? Spacing.buttonHeightLarge : Spacing.buttonHeightMedium;
  const displayContent = label || children;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          height,
          opacity: disabled ? 0.5 : 1,
          ...getBorderStyle(),
        },
        style,
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof displayContent === "string" ? displayContent : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <ThemedText
          style={[
            styles.buttonText,
            { color: getTextColor() },
          ]}
        >
          {displayContent}
        </ThemedText>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.r2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.s6,
    minWidth: 44,
    minHeight: 44,
  },
  buttonText: {
    ...Typography.button,
  },
});
