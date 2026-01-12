import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, FlatList, RefreshControl, AccessibilityInfo } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { WelcomeIllustration } from "@/components/WelcomeIllustration";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Typography } from "@/constants/theme";
import { useOnboardingStore, SavedScan } from "@/stores/onboardingStore";
import { analytics } from "@/lib/analytics";

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

export default function OnboardingHomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { recentScans, completeOnboarding, timeToFirstScanSeconds } = useOnboardingStore();

  useEffect(() => {
    analytics.screenViewed("Home", { scanCount: recentScans.length });
  }, [recentScans.length]);

  const handleScanMeal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.ctaTapped("scan_meal", "Home");
    if (timeToFirstScanSeconds) {
      analytics.onboardingCompleted(timeToFirstScanSeconds);
    }
    completeOnboarding();
  }, [timeToFirstScanSeconds, completeOnboarding]);

  const hasMeals = recentScans.length > 0;

  const renderMealItem = useCallback(({ item }: { item: SavedScan }) => (
    <Card style={styles.mealCard}>
      <View style={styles.mealCardContent}>
        {item.thumbnailUri ? (
          <Image
            source={{ uri: item.thumbnailUri }}
            style={[styles.mealThumbnail, { backgroundColor: theme.surfaceAlt }]}
          />
        ) : (
          <View style={[styles.mealIcon, { backgroundColor: theme.accentSoft }]}>
            <Feather name="camera" size={20} color={theme.accent} />
          </View>
        )}
        <View style={styles.mealInfo}>
          <ThemedText style={[styles.mealName, { color: theme.textPrimary }]}>
            {item.name}
          </ThemedText>
          <ThemedText style={[styles.mealMeta, { color: theme.textTertiary }]}>
            {formatTimeAgo(item.timestamp)} · {item.itemCount} items
          </ThemedText>
        </View>
        <View style={styles.mealCarbsBadge}>
          <ThemedText style={[styles.mealCarbsValue, { color: theme.textPrimary }]}>
            {item.totalCarbs}
          </ThemedText>
          <ThemedText style={[styles.mealCarbsUnit, { color: theme.textTertiary }]}>
            g
          </ThemedText>
        </View>
      </View>
    </Card>
  ), [theme]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={styles.illustrationContainer}>
        <WelcomeIllustration maxWidth={240} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
        No meals scanned yet
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
        Tap the button below to scan your first meal
      </ThemedText>
    </View>
  ), [theme]);

  const renderListHeader = useCallback(() => (
    <ThemedText style={[styles.sectionTitle, { color: theme.textPrimary }]}>
      Recent scans
    </ThemedText>
  ), [theme]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.screenBg }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.s4,
          },
        ]}
      >
        <View style={styles.header} accessibilityRole="header">
          <View style={styles.headerLeft}>
            <View style={[styles.appIcon, { backgroundColor: theme.accent }]}>
              <Feather name="camera" size={20} color={theme.textOnAccent} />
            </View>
            <ThemedText style={[styles.appTitle, { color: theme.textPrimary }]}>
              CarbScan
            </ThemedText>
          </View>
        </View>

        <View style={styles.historySection}>
          {hasMeals ? (
            <FlatList
              data={recentScans}
              renderItem={renderMealItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mealList}
              ListHeaderComponent={renderListHeader}
            />
          ) : (
            <View style={styles.emptyContainer}>
              {renderListHeader()}
              {renderEmptyState()}
            </View>
          )}
        </View>
      </View>

      <View
        style={[
          styles.fabContainer,
          { 
            bottom: insets.bottom + Spacing.s6,
            paddingHorizontal: Spacing.s4,
          },
        ]}
      >
        <Button
          variant="primary"
          size="large"
          onPress={handleScanMeal}
          style={[styles.fab, Shadows.floatingButton]}
          accessibilityLabel="Scan a meal"
          accessibilityHint="Opens camera to take a photo of your food"
        >
          <View style={styles.fabContent}>
            <Feather name="camera" size={24} color={theme.textOnAccent} />
            <ThemedText style={[styles.fabText, { color: theme.textOnAccent }]}>
              Scan a meal
            </ThemedText>
          </View>
        </Button>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.s4,
    marginBottom: Spacing.s6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s3,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.r1,
    justifyContent: "center",
    alignItems: "center",
  },
  appTitle: {
    ...Typography.h1,
  },
  historySection: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
  },
  sectionTitle: {
    ...Typography.h2,
    marginBottom: Spacing.s4,
  },
  mealList: {
    gap: Spacing.s3,
    paddingBottom: 120,
  },
  mealCard: {
    padding: Spacing.s4,
  },
  mealCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s3,
  },
  mealThumbnail: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.r1,
  },
  mealIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.r1,
    justifyContent: "center",
    alignItems: "center",
  },
  mealInfo: {
    flex: 1,
    gap: Spacing.s1,
  },
  mealName: {
    ...Typography.bodyMedium,
  },
  mealMeta: {
    ...Typography.micro,
  },
  mealCarbsBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  mealCarbsValue: {
    ...Typography.h2,
  },
  mealCarbsUnit: {
    ...Typography.caption,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.s3,
    paddingBottom: 120,
  },
  illustrationContainer: {
    marginBottom: Spacing.s6,
  },
  emptyTitle: {
    ...Typography.body,
    textAlign: "center",
  },
  emptySubtitle: {
    ...Typography.caption,
    textAlign: "center",
    maxWidth: 220,
  },
  fabContainer: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  fab: {
    width: "100%",
  },
  fabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
  },
  fabText: {
    ...Typography.button,
  },
});
