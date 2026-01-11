import React, { useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./ThemedText";
import { Button } from "./Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Motion, Typography } from "@/constants/theme";

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  body?: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  children?: React.ReactNode;
}

export function BottomSheet({
  visible,
  onDismiss,
  title,
  body,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  children,
}: BottomSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      backdropOpacity.value = withTiming(1, { duration: Motion.modalSheet });
      AccessibilityInfo.announceForAccessibility(title);
    } else {
      translateY.value = withTiming(300, { duration: Motion.modalSheet });
      backdropOpacity.value = withTiming(0, { duration: Motion.pressFeedback });
    }
  }, [visible, title, translateY, backdropOpacity]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handlePrimary = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPrimaryPress();
  }, [onPrimaryPress]);

  const handleSecondary = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSecondaryPress?.();
  }, [onSecondaryPress]);

  const handleBackdrop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <Animated.View
          style={[
            styles.backdrop,
            backdropAnimatedStyle,
            { backgroundColor: theme.scrim },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdrop} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            sheetAnimatedStyle,
            {
              backgroundColor: theme.cardBg,
              paddingBottom: insets.bottom + Spacing.s4,
              ...Shadows.modal,
            },
          ]}
          accessibilityViewIsModal
          accessibilityRole="dialog"
        >
          <View style={styles.handle} />

          <View style={styles.content}>
            <ThemedText
              style={[styles.title, { color: theme.textPrimary }]}
              accessibilityRole="header"
            >
              {title}
            </ThemedText>

            {body && (
              <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
                {body}
              </ThemedText>
            )}

            {children}

            <View style={styles.actions}>
              <Button
                variant="primary"
                size="large"
                label={primaryLabel}
                onPress={handlePrimary}
                style={styles.primaryButton}
              />
              {secondaryLabel && onSecondaryPress && (
                <Pressable
                  onPress={handleSecondary}
                  style={styles.secondaryButton}
                  accessibilityRole="button"
                >
                  <ThemedText
                    style={[styles.secondaryText, { color: theme.textSecondary }]}
                  >
                    {secondaryLabel}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.r4,
    borderTopRightRadius: BorderRadius.r4,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.s2,
    marginBottom: Spacing.s4,
  },
  content: {
    paddingHorizontal: Spacing.s4,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.s2,
  },
  body: {
    ...Typography.body,
    marginBottom: Spacing.s6,
  },
  actions: {
    marginTop: Spacing.s4,
    gap: Spacing.s3,
  },
  primaryButton: {
    width: "100%",
  },
  secondaryButton: {
    paddingVertical: Spacing.s3,
    alignItems: "center",
  },
  secondaryText: {
    ...Typography.button,
  },
});
