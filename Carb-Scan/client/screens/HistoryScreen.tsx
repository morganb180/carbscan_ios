import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getMeals, deleteMeal } from "@/utils/storage";
import { carbscanAPI } from "@/utils/api";
import { MealRecord, isMealSummary } from "@/types";

type HistoryNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface MealCardProps {
  meal: MealRecord;
  onPress: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function MealCard({ meal, onPress, onDelete, canDelete }: MealCardProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const deleteOpacity = useSharedValue(0);
  const isApiOnly = isMealSummary(meal);

  const handleDelete = () => {
    if (!canDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (!canDelete) return;
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -80);
        deleteOpacity.value = Math.min(Math.abs(e.translationX) / 80, 1);
      }
    })
    .onEnd((e) => {
      if (!canDelete) return;
      if (e.translationX < -60) {
        runOnJS(handleDelete)();
      }
      translateX.value = withSpring(0);
      deleteOpacity.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: deleteOpacity.value,
  }));

  const mealName = isApiOnly
    ? meal.name
    : meal.foodItems.map((item) => item.name).join(", ");

  return (
    <View style={styles.cardWrapper}>
      {canDelete ? (
        <Animated.View
          style={[
            styles.deleteButton,
            { backgroundColor: theme.error },
            deleteButtonStyle,
          ]}
        >
          <Feather name="trash-2" size={24} color="#fff" />
        </Animated.View>
      ) : null}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.mealCard,
              {
                backgroundColor: theme.cardBackground,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {isApiOnly ? (
              <View style={[styles.placeholderImage, { backgroundColor: theme.border }]}>
                <Feather name="cloud" size={24} color={theme.textSecondary} />
              </View>
            ) : (
              <Image source={{ uri: meal.imageUri }} style={styles.mealImage} />
            )}
            <View style={styles.mealInfo}>
              <ThemedText type="body" numberOfLines={1} style={styles.mealName}>
                {mealName}
              </ThemedText>
              <View style={styles.mealMeta}>
                <ThemedText
                  type="h4"
                  style={{ color: theme.primary }}
                >
                  {meal.totalCarbs}g
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {formatTimeAgo(meal.timestamp)}
                </ThemedText>
              </View>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { subscription, isAuthenticated, user } = useAuth();
  const navigation = useNavigation<HistoryNavigationProp>();

  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMeals = useCallback(async () => {
    const localMeals = await getMeals();
    const localMealsById = new Map(localMeals.map(m => [m.id, m]));

    if (isAuthenticated && user?.id !== "demo-user") {
      try {
        const apiResponse = await carbscanAPI.meals.getHistory(50, 0);
        const apiMeals: MealRecord[] = apiResponse.meals.map(apiMeal => ({
          id: String(apiMeal.id),
          name: apiMeal.name,
          totalCarbs: apiMeal.carbEstimate,
          confidenceLevel: apiMeal.confidenceLevel,
          timestamp: apiMeal.createdAt,
          isApiOnly: true as const,
        }));

        const mergedMeals: MealRecord[] = [];
        const seenIds = new Set<string>();

        for (const meal of localMeals) {
          mergedMeals.push(meal);
          seenIds.add(meal.id);
        }

        for (const apiMeal of apiMeals) {
          if (!seenIds.has(apiMeal.id)) {
            mergedMeals.push(apiMeal);
            seenIds.add(apiMeal.id);
          }
        }

        mergedMeals.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setMeals(mergedMeals);
      } catch (error) {
        console.error("Failed to fetch meals from API:", error);
        setMeals(localMeals);
      }
    } else {
      setMeals(localMeals);
    }
  }, [isAuthenticated, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [loadMeals])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMeals();
    setIsRefreshing(false);
  };

  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert(
      "Delete Meal",
      "Are you sure you want to delete this meal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteMeal(mealId);
            setMeals((prev) => prev.filter((m) => m.id !== mealId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleMealPress = (meal: MealRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isMealSummary(meal)) {
      Alert.alert(
        "Meal Details",
        `${meal.name}\n\nCarbs: ${meal.totalCarbs}g\nConfidence: ${meal.confidenceLevel}\n\nFull details not available for this meal.`,
        [{ text: "OK" }]
      );
    } else {
      navigation.navigate("MealDetail", { mealId: meal.id });
    }
  };

  const getHistoryMessage = () => {
    switch (subscription.tier) {
      case "free":
        return "Free plan: 7 days of history";
      case "essentials":
        return "Essentials plan: 30 days of history";
      case "pro":
        return "Pro plan: Unlimited history";
      default:
        return "";
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="clock" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Meals Yet
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        Scan your first meal to start tracking your carbs!
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MealCard
            meal={item}
            onPress={() => handleMealPress(item)}
            onDelete={() => handleDeleteMeal(item.id)}
            canDelete={!isMealSummary(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          meals.length === 0 && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          meals.length > 0 ? (
            <View style={styles.footer}>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                {getHistoryMessage()}
              </ThemedText>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  cardWrapper: {
    position: "relative",
  },
  deleteButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  mealCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    ...Shadows.card,
  },
  mealImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  mealInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  mealName: {
    fontWeight: "500",
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
  },
  footer: {
    paddingVertical: Spacing.xl,
  },
});
