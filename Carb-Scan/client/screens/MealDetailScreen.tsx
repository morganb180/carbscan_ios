import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getMealById, deleteMeal } from "@/utils/storage";
import { Meal } from "@/types";

type MealDetailRouteProp = RouteProp<RootStackParamList, "MealDetail">;
type MealDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MealDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<MealDetailNavigationProp>();
  const route = useRoute<MealDetailRouteProp>();

  const [meal, setMeal] = useState<Meal | null>(null);

  useEffect(() => {
    loadMeal();
  }, [route.params.mealId]);

  const loadMeal = async () => {
    const data = await getMealById(route.params.mealId);
    setMeal(data);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Meal",
      "Are you sure you want to delete this meal? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await deleteMeal(route.params.mealId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="trash-2" size={20} color={theme.error} />
        </Pressable>
      ),
    });
  }, [navigation, theme]);

  if (!meal) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ThemedText type="body">Loading...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Image source={{ uri: meal.imageUri }} style={styles.mealImage} />

      <Card elevation={1} style={styles.carbCard}>
        <View style={styles.carbHeader}>
          <ThemedText style={[styles.carbNumber, { color: theme.primary }]}>
            {meal.totalCarbs}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            grams of carbs
          </ThemedText>
        </View>
        <View style={styles.confidenceBadge}>
          <Feather name="check-circle" size={14} color={theme.success} />
          <ThemedText type="caption" style={{ color: theme.success }}>
            {meal.confidence}% confidence
          </ThemedText>
        </View>
      </Card>

      <Card elevation={1} style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Feather name="clock" size={18} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {formatDate(meal.timestamp)}
          </ThemedText>
        </View>
        {!meal.synced ? (
          <View style={styles.infoRow}>
            <Feather name="cloud-off" size={18} color={theme.warning} />
            <ThemedText type="body" style={{ color: theme.warning }}>
              Not synced to cloud
            </ThemedText>
          </View>
        ) : null}
      </Card>

      <Card elevation={1} style={styles.foodCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Food Items Detected
        </ThemedText>
        {meal.foodItems.map((item, index) => (
          <View
            key={index}
            style={[
              styles.foodItem,
              index < meal.foodItems.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={styles.foodItemInfo}>
              <ThemedText type="body">{item.name}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {item.portion}
              </ThemedText>
            </View>
            <View style={styles.carbBadge}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {item.carbs}g
              </ThemedText>
            </View>
          </View>
        ))}
      </Card>

      <Card elevation={1} style={styles.nutritionCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Full Nutrition Breakdown
        </ThemedText>
        <View style={styles.nutritionGrid}>
          <View style={[styles.nutritionItem, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3">{meal.nutrition.calories}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Calories
            </ThemedText>
          </View>
          <View style={[styles.nutritionItem, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3">{meal.totalCarbs}g</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Carbs
            </ThemedText>
          </View>
          <View style={[styles.nutritionItem, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3">{meal.nutrition.protein}g</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Protein
            </ThemedText>
          </View>
          <View style={[styles.nutritionItem, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3">{meal.nutrition.fat}g</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Fat
            </ThemedText>
          </View>
          <View style={[styles.nutritionItem, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3">{meal.nutrition.fiber}g</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Fiber
            </ThemedText>
          </View>
          <View style={[styles.nutritionItem, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3">{meal.nutrition.sugar}g</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Sugar
            </ThemedText>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButton: {
    padding: Spacing.sm,
  },
  mealImage: {
    width: "100%",
    height: 250,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  carbCard: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  carbHeader: {
    alignItems: "center",
  },
  carbNumber: {
    ...Typography.carbCount,
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  infoCard: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  foodCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  foodItemInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  carbBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  nutritionCard: {
    marginBottom: Spacing.lg,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  nutritionItem: {
    width: "31%",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
});
