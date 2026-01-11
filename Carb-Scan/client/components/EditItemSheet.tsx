import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";
import { Button } from "./Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Motion, Typography } from "@/constants/theme";

const PORTION_MULTIPLIERS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export interface FoodItem {
  id: string;
  name: string;
  carbsEstimate: number;
  carbsLow: number;
  carbsHigh: number;
  portionMultiplier?: number;
}

interface EditItemSheetProps {
  visible: boolean;
  item: FoodItem | null;
  onDismiss: () => void;
  onSave: (updatedItem: FoodItem) => void;
  onDelete?: (itemId: string) => void;
}

export function EditItemSheet({
  visible,
  item,
  onDismiss,
  onSave,
  onDelete,
}: EditItemSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  const [name, setName] = useState("");
  const [portionMultiplier, setPortionMultiplier] = useState(1);

  React.useEffect(() => {
    if (visible && item) {
      setName(item.name);
      setPortionMultiplier(item.portionMultiplier || 1);
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      backdropOpacity.value = withTiming(1, { duration: Motion.modalSheet });
      AccessibilityInfo.announceForAccessibility(`Editing ${item.name}`);
    } else {
      translateY.value = withTiming(300, { duration: Motion.modalSheet });
      backdropOpacity.value = withTiming(0, { duration: Motion.pressFeedback });
    }
  }, [visible, item, translateY, backdropOpacity]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handlePortionSelect = useCallback((multiplier: number) => {
    Haptics.selectionAsync();
    setPortionMultiplier(multiplier);
  }, []);

  const handleSave = useCallback(() => {
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updatedItem: FoodItem = {
      ...item,
      name: name.trim() || item.name,
      portionMultiplier,
      carbsEstimate: Math.round(item.carbsEstimate * portionMultiplier),
      carbsLow: Math.round(item.carbsLow * portionMultiplier),
      carbsHigh: Math.round(item.carbsHigh * portionMultiplier),
    };
    onSave(updatedItem);
  }, [item, name, portionMultiplier, onSave]);

  const handleDelete = useCallback(() => {
    if (!item || !onDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(item.id);
  }, [item, onDelete]);

  const handleBackdrop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  if (!item) return null;

  const baseCarbs = item.carbsEstimate / (item.portionMultiplier || 1);
  const adjustedCarbs = Math.round(baseCarbs * portionMultiplier);

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
          accessibilityLabel="Edit item"
        >
          <View style={styles.handle} />

          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText
                style={[styles.title, { color: theme.textPrimary }]}
                accessibilityRole="header"
              >
                Edit item
              </ThemedText>
              <View style={styles.carbsBadge}>
                <ThemedText style={[styles.carbsText, { color: theme.textPrimary }]}>
                  {adjustedCarbs}g
                </ThemedText>
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Name
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceAlt,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
                placeholderTextColor={theme.textTertiary}
                accessibilityLabel="Item name"
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Portion size
              </ThemedText>
              <View style={styles.portionGrid}>
                {PORTION_MULTIPLIERS.map((multiplier) => {
                  const isSelected = portionMultiplier === multiplier;
                  return (
                    <Pressable
                      key={multiplier}
                      onPress={() => handlePortionSelect(multiplier)}
                      style={[
                        styles.portionButton,
                        {
                          backgroundColor: isSelected
                            ? theme.accent
                            : theme.surfaceAlt,
                          borderColor: isSelected ? theme.accent : theme.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${multiplier}x portion`}
                    >
                      <ThemedText
                        style={[
                          styles.portionText,
                          { color: isSelected ? theme.textOnAccent : theme.textPrimary },
                        ]}
                      >
                        {multiplier}x
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                variant="primary"
                size="large"
                label="Done"
                onPress={handleSave}
                style={styles.primaryButton}
              />
              {onDelete && (
                <Pressable
                  onPress={handleDelete}
                  style={styles.deleteButton}
                  accessibilityRole="button"
                  accessibilityLabel="Remove item"
                >
                  <Feather name="trash-2" size={18} color={theme.danger} />
                  <ThemedText style={[styles.deleteText, { color: theme.danger }]}>
                    Remove item
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.s5,
  },
  title: {
    ...Typography.h1,
  },
  carbsBadge: {
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s1,
    borderRadius: BorderRadius.r1,
  },
  carbsText: {
    ...Typography.h2,
  },
  field: {
    marginBottom: Spacing.s5,
  },
  label: {
    ...Typography.caption,
    marginBottom: Spacing.s2,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.r2,
    paddingHorizontal: Spacing.s4,
    borderWidth: 1,
    ...Typography.body,
  },
  portionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s2,
  },
  portionButton: {
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    borderRadius: BorderRadius.r2,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  portionText: {
    ...Typography.bodyMedium,
  },
  actions: {
    marginTop: Spacing.s4,
    gap: Spacing.s3,
  },
  primaryButton: {
    width: "100%",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.s2,
    paddingVertical: Spacing.s3,
  },
  deleteText: {
    ...Typography.button,
  },
});
