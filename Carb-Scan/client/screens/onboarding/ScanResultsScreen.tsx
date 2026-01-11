import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  AccessibilityInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";
import { EditItemSheet, FoodItem } from "@/components/EditItemSheet";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";
import type { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

const sampleMealImage = require("../../../assets/images/sample-meal.png");

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Results">;
type ResultsRouteProp = RouteProp<OnboardingStackParamList, "Results">;

export interface ScanResult {
  totalCarbs: number;
  totalCarbsLow: number;
  totalCarbsHigh: number;
  items: FoodItem[];
  confidence: "High" | "Medium" | "Low";
  confidenceReason: string;
}

const SAMPLE_RESULT: ScanResult = {
  totalCarbs: 45,
  totalCarbsLow: 38,
  totalCarbsHigh: 52,
  items: [
    { id: "1", name: "Grilled chicken breast", carbsLow: 0, carbsHigh: 2, carbsEstimate: 1, portionMultiplier: 1 },
    { id: "2", name: "Brown rice", carbsLow: 28, carbsHigh: 35, carbsEstimate: 32, portionMultiplier: 1 },
    { id: "3", name: "Steamed broccoli", carbsLow: 4, carbsHigh: 8, carbsEstimate: 6, portionMultiplier: 1 },
    { id: "4", name: "Teriyaki sauce", carbsLow: 4, carbsHigh: 8, carbsEstimate: 6, portionMultiplier: 1 },
  ],
  confidence: "High",
  confidenceReason: "Clear photo with identifiable portions.",
};

export default function ScanResultsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultsRouteProp>();
  const { isAuthenticated } = useAuth();

  const {
    completeScan,
    hasShownTimeToFirstWin,
    timeToFirstScanSeconds,
    markTimeToFirstWinShown,
  } = useOnboardingStore();

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showTimeToWin, setShowTimeToWin] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [lastSavedResult, setLastSavedResult] = useState<ScanResult | null>(null);

  const timeToWinOpacity = useSharedValue(0);

  const useSample = route.params?.useSample;
  const imageUri = route.params?.imageUri;

  useEffect(() => {
    analytics.onboardingViewedScreen("ScanResultsScreen");
    simulateAnalysis();
  }, []);

  const simulateAnalysis = async () => {
    await new Promise((resolve) => setTimeout(resolve, useSample ? 500 : 2000));

    completeScan();
    setResult(SAMPLE_RESULT);
    setIsLoading(false);
    
    analytics.scanCompleted(
      SAMPLE_RESULT.totalCarbs,
      SAMPLE_RESULT.items.length,
      SAMPLE_RESULT.confidence
    );

    if (!useSample && !hasShownTimeToFirstWin) {
      setTimeout(() => {
        setShowTimeToWin(true);
        if (timeToFirstScanSeconds) {
          analytics.timeToFirstWinShown(timeToFirstScanSeconds);
        }
        timeToWinOpacity.value = withTiming(1, { duration: 300 });

        setTimeout(() => {
          timeToWinOpacity.value = withTiming(0, { duration: 300 }, () => {
            runOnJS(setShowTimeToWin)(false);
            runOnJS(markTimeToFirstWinShown)();
          });
        }, 1500);
      }, 500);
    }
  };

  const recalculateTotals = useCallback((items: FoodItem[]): ScanResult => {
    const totalCarbs = items.reduce((sum, item) => sum + item.carbsEstimate, 0);
    const totalCarbsLow = items.reduce((sum, item) => sum + item.carbsLow, 0);
    const totalCarbsHigh = items.reduce((sum, item) => sum + item.carbsHigh, 0);
    return {
      ...result!,
      items,
      totalCarbs,
      totalCarbsLow,
      totalCarbsHigh,
    };
  }, [result]);

  const handleEditItem = useCallback((item: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingItem(item);
  }, []);

  const handleSaveItem = useCallback((updatedItem: FoodItem) => {
    if (!result) return;
    analytics.itemEdited(updatedItem.id);
    const updatedItems = result.items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    setResult(recalculateTotals(updatedItems));
    setEditingItem(null);
  }, [result, recalculateTotals]);

  const handleDeleteItem = useCallback((itemId: string) => {
    if (!result) return;
    const updatedItems = result.items.filter((item) => item.id !== itemId);
    setResult(recalculateTotals(updatedItems));
    setEditingItem(null);
  }, [result, recalculateTotals]);

  const handleSaveScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.saveTapped(isAuthenticated);

    if (isAuthenticated) {
      handleSaveAndContinue();
    } else {
      navigation.navigate("SaveGate", { result: result! });
    }
  };

  const handleSaveAndContinue = () => {
    if (!result) return;
    
    setLastSavedResult(result);
    const store = useOnboardingStore.getState();
    store.completeSave();
    
    const scanId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const mainItemName = result.items[0]?.name || "Meal";
    store.addSavedScan({
      id: scanId,
      name: mainItemName,
      totalCarbs: result.totalCarbs,
      itemCount: result.items.length,
      timestamp: Date.now(),
      thumbnailUri: imageUri,
    });
    
    analytics.saveCompleted(scanId);
    
    setToastMessage("Scan saved");
    setShowToast(true);
    AccessibilityInfo.announceForAccessibility("Scan saved successfully");

    setTimeout(() => {
      navigation.navigate("NotificationsPermission");
    }, 500);
  };

  const handleUndo = useCallback(() => {
    if (lastSavedResult) {
      analytics.saveUndone();
      setResult(lastSavedResult);
      setLastSavedResult(null);
      
      const store = useOnboardingStore.getState();
      if (store.recentScans.length > 0) {
        store.removeSavedScan(store.recentScans[0].id);
      }
    }
    setShowToast(false);
  }, [lastSavedResult]);

  const handleScanAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.scanAgainTapped();
    navigation.replace("Camera");
  };

  const timeToWinStyle = useAnimatedStyle(() => ({
    opacity: timeToWinOpacity.value,
  }));

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "High":
        return theme.successFg;
      case "Medium":
        return theme.warningFg;
      case "Low":
        return theme.errorFg;
      default:
        return theme.textSecondary;
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
            Analyzing your meal...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!result) return null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {(imageUri || useSample) && (
          <View style={styles.imageContainer}>
            <Image
              source={useSample ? sampleMealImage : { uri: imageUri }}
              style={styles.mealImage}
              resizeMode="cover"
              accessibilityLabel="Photo of your meal"
            />
          </View>
        )}

        <View style={styles.heroSection} accessibilityRole="summary">
          <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>
            Estimated Carbs
          </ThemedText>
          <View style={styles.carbsRow}>
            <ThemedText style={[styles.carbsNumber, { color: theme.textPrimary }]}>
              {result.totalCarbs}
            </ThemedText>
            <ThemedText style={[styles.carbsUnit, { color: theme.textSecondary }]}>
              g
            </ThemedText>
          </View>
          <ThemedText style={[styles.rangeText, { color: theme.textTertiary }]}>
            Range: {result.totalCarbsLow}g - {result.totalCarbsHigh}g
          </ThemedText>
          <ThemedText style={[styles.rangeCaption, { color: theme.textTertiary }]}>
            Range reflects portion uncertainty.
          </ThemedText>

          <View style={styles.confidenceRow}>
            <ThemedText style={[styles.confidenceLabel, { color: theme.textSecondary }]}>
              Confidence:{" "}
            </ThemedText>
            <ThemedText style={[styles.confidenceValue, { color: getConfidenceColor(result.confidence) }]}>
              {result.confidence}
            </ThemedText>
          </View>
          <ThemedText style={[styles.confidenceReason, { color: theme.textTertiary }]}>
            {result.confidenceReason}
          </ThemedText>

          {showTimeToWin && timeToFirstScanSeconds && (
            <Animated.View style={[styles.timeToWinContainer, timeToWinStyle]}>
              <ThemedText style={[styles.timeToWinText, { color: theme.textSecondary }]}>
                Done. That took {timeToFirstScanSeconds} seconds.
              </ThemedText>
            </Animated.View>
          )}
        </View>

        <Card style={styles.itemsCard}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Detected Items
          </ThemedText>
          {result.items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => handleEditItem(item)}
              style={({ pressed }) => [
                styles.itemRow,
                pressed && { backgroundColor: theme.surfacePressed },
                index < result.items.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.divider,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.carbsEstimate} grams carbs. Double tap to edit.`}
              accessibilityHint="Opens editor to adjust portion size"
            >
              <View style={styles.itemContent}>
                <ThemedText style={[styles.itemName, { color: theme.textPrimary }]}>
                  {item.name}
                </ThemedText>
                {item.portionMultiplier && item.portionMultiplier !== 1 && (
                  <ThemedText style={[styles.portionLabel, { color: theme.textTertiary }]}>
                    {item.portionMultiplier}x portion
                  </ThemedText>
                )}
              </View>
              <View style={styles.itemRight}>
                <ThemedText style={[styles.itemCarbs, { color: theme.textSecondary }]}>
                  {item.carbsEstimate}g
                </ThemedText>
                <Feather name="chevron-right" size={18} color={theme.textTertiary} />
              </View>
            </Pressable>
          ))}
        </Card>

        <View style={styles.reassuranceSection}>
          <ThemedText style={[styles.reassuranceText, { color: theme.textTertiary }]}>
            Not perfect. Still useful.
          </ThemedText>
        </View>

        <View style={styles.ctaSection}>
          <Button
            variant="primary"
            size="large"
            label="Save scan"
            onPress={handleSaveScan}
            accessibilityLabel="Save this scan to your history"
          />

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleScanAgain}
            accessibilityRole="button"
            accessibilityLabel="Scan again"
          >
            <Feather name="camera" size={18} color={theme.accent} />
            <ThemedText style={[styles.secondaryButtonText, { color: theme.accent }]}>
              Scan again
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <EditItemSheet
        visible={editingItem !== null}
        item={editingItem}
        onDismiss={() => setEditingItem(null)}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />

      <Toast
        message={toastMessage}
        visible={showToast}
        onDismiss={() => setShowToast(false)}
        actionLabel={lastSavedResult ? "Undo" : undefined}
        onAction={lastSavedResult ? handleUndo : undefined}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.s4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    height: 200,
    borderRadius: BorderRadius.r3,
    overflow: "hidden",
    marginBottom: Spacing.s6,
  },
  mealImage: {
    width: "100%",
    height: "100%",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing.s6,
  },
  labelText: {
    ...Typography.caption,
  },
  carbsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.s1,
  },
  carbsNumber: {
    ...Typography.display,
    fontSize: 72,
    lineHeight: 80,
  },
  carbsUnit: {
    ...Typography.h2,
  },
  rangeText: {
    ...Typography.caption,
    marginTop: Spacing.s1,
  },
  rangeCaption: {
    ...Typography.micro,
    marginTop: Spacing.s1,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.s4,
  },
  confidenceLabel: {
    ...Typography.caption,
  },
  confidenceValue: {
    ...Typography.caption,
    fontWeight: "600",
  },
  confidenceReason: {
    ...Typography.micro,
    textAlign: "center",
    marginTop: Spacing.s1,
    maxWidth: 280,
  },
  timeToWinContainer: {
    marginTop: Spacing.s4,
  },
  timeToWinText: {
    ...Typography.caption,
    textAlign: "center",
  },
  itemsCard: {
    marginBottom: Spacing.s4,
    padding: Spacing.s4,
  },
  sectionTitle: {
    ...Typography.h2,
    marginBottom: Spacing.s3,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.s3,
    minHeight: 44,
  },
  itemContent: {
    flex: 1,
    marginRight: Spacing.s3,
  },
  itemName: {
    ...Typography.body,
  },
  portionLabel: {
    ...Typography.micro,
    marginTop: Spacing.s1,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
  },
  itemCarbs: {
    ...Typography.body,
  },
  reassuranceSection: {
    alignItems: "center",
    marginBottom: Spacing.s6,
  },
  reassuranceText: {
    ...Typography.caption,
    fontStyle: "italic",
  },
  ctaSection: {
    gap: Spacing.s3,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.s2,
    paddingVertical: Spacing.s3,
    minHeight: 44,
  },
  secondaryButtonText: {
    ...Typography.button,
  },
});
