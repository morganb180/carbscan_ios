import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getMeals } from "@/utils/storage";
import { carbscanAPI, InsightsResponse } from "@/utils/api";
import { DailyCarbs, MealTimeBreakdown, Meal } from "@/types";

const screenWidth = Dimensions.get("window").width;
const chartWidth = screenWidth - Spacing.lg * 2 - Spacing.xl * 2;

interface InsightsData {
  weeklyCarbs: DailyCarbs[];
  mealTimeBreakdown: MealTimeBreakdown | null;
  streakDays: number;
  totalScans: number;
  avgCarbs: number;
  trend?: {
    direction: string;
    percentageChange: number;
  };
}

interface BarChartProps {
  data: DailyCarbs[];
  maxValue: number;
  primaryColor: string;
}

function BarChart({ data, maxValue, primaryColor }: BarChartProps) {
  const { theme } = useTheme();
  const barWidth = (chartWidth - (data.length - 1) * 8) / data.length;
  const safeMaxValue = maxValue > 0 ? maxValue : 1;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsContainer}>
        {data.map((item, index) => {
          const height = Math.max((item.carbs / safeMaxValue) * 120, 4);
          return (
            <View key={index} style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    width: barWidth,
                    backgroundColor: primaryColor,
                  },
                ]}
              />
              <ThemedText
                type="caption"
                style={[styles.barLabel, { color: theme.textSecondary }]}
              >
                {item.date}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface MealTimeChartProps {
  data: MealTimeBreakdown;
  primaryColor: string;
}

function MealTimeChart({ data, primaryColor }: MealTimeChartProps) {
  const { theme } = useTheme();
  const total = data.breakfast + data.lunch + data.dinner + data.snacks;
  const safeTotal = total > 0 ? total : 1;

  const items = [
    { label: "Breakfast", value: data.breakfast, icon: "sunrise" as const },
    { label: "Lunch", value: data.lunch, icon: "sun" as const },
    { label: "Dinner", value: data.dinner, icon: "sunset" as const },
    { label: "Snacks", value: data.snacks, icon: "coffee" as const },
  ];

  return (
    <View style={styles.mealTimeContainer}>
      {items.map((item, index) => {
        const percentage = Math.round((item.value / safeTotal) * 100);
        return (
          <View key={index} style={styles.mealTimeItem}>
            <View style={styles.mealTimeHeader}>
              <Feather name={item.icon} size={20} color={primaryColor} />
              <ThemedText type="body">{item.label}</ThemedText>
            </View>
            <View style={styles.mealTimeBar}>
              <View
                style={[
                  styles.mealTimeProgress,
                  {
                    width: `${percentage}%`,
                    backgroundColor: primaryColor,
                  },
                ]}
              />
            </View>
            <View style={styles.mealTimeValues}>
              <ThemedText type="h4">{item.value}g</ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                {percentage}%
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  primaryColor: string;
}

function StatCard({ icon, label, value, primaryColor }: StatCardProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
      <Feather name={icon} size={24} color={primaryColor} />
      <ThemedText type="h3">{value}</ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

function calculateInsightsFromMeals(meals: Meal[]): InsightsData {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  const recentMeals = meals.filter((meal) => {
    const mealDate = new Date(meal.timestamp);
    return mealDate >= sevenDaysAgo && mealDate <= today;
  });

  const weeklyCarbs: DailyCarbs[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const mealsForDay = recentMeals.filter((meal) => {
      const mealDate = new Date(meal.timestamp);
      return mealDate >= dayStart && mealDate <= dayEnd;
    });
    
    const totalCarbs = mealsForDay.reduce((sum, m) => sum + m.totalCarbs, 0);
    weeklyCarbs.push({
      date: daysOfWeek[date.getDay()],
      carbs: totalCarbs,
      mealCount: mealsForDay.length,
    });
  }

  const mealTimeBreakdown: MealTimeBreakdown = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snacks: 0,
  };

  recentMeals.forEach((meal) => {
    const hour = new Date(meal.timestamp).getHours();
    if (hour >= 5 && hour < 11) {
      mealTimeBreakdown.breakfast += meal.totalCarbs;
    } else if (hour >= 11 && hour < 15) {
      mealTimeBreakdown.lunch += meal.totalCarbs;
    } else if (hour >= 17 && hour < 21) {
      mealTimeBreakdown.dinner += meal.totalCarbs;
    } else {
      mealTimeBreakdown.snacks += meal.totalCarbs;
    }
  });

  const uniqueDays = new Set(
    meals.map((m) => new Date(m.timestamp).toDateString())
  );
  const streakDays = uniqueDays.size;

  const totalCarbs = weeklyCarbs.reduce((sum, d) => sum + d.carbs, 0);
  const avgCarbs = meals.length > 0 ? Math.round(totalCarbs / 7) : 0;

  return {
    weeklyCarbs,
    mealTimeBreakdown,
    streakDays,
    totalScans: meals.length,
    avgCarbs,
  };
}

function transformApiInsights(apiData: InsightsResponse): InsightsData {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  
  const weeklyCarbs: DailyCarbs[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    weeklyCarbs.push({
      date: daysOfWeek[date.getDay()],
      carbs: Math.round(apiData.summary.weekly.dailyAverage),
      mealCount: Math.round(apiData.summary.weekly.mealCount / 7),
    });
  }

  return {
    weeklyCarbs,
    mealTimeBreakdown: null,
    streakDays: apiData.summary.weekly.mealCount > 0 ? 7 : 0,
    totalScans: apiData.summary.monthly.mealCount,
    avgCarbs: Math.round(apiData.summary.weekly.dailyAverage),
    trend: {
      direction: apiData.trends.direction,
      percentageChange: apiData.trends.percentageChange,
    },
  };
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();

  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadInsights() {
        setIsLoading(true);
        try {
          if (isAuthenticated && user?.id !== "demo-user") {
            const apiData = await carbscanAPI.insights.get();
            const transformed = transformApiInsights(apiData);
            setInsights(transformed);
          } else {
            const meals = await getMeals();
            const calculated = calculateInsightsFromMeals(meals);
            setInsights(calculated);
          }
        } catch (error) {
          console.error("Failed to load insights:", error);
          const meals = await getMeals();
          const calculated = calculateInsightsFromMeals(meals);
          setInsights(calculated);
        } finally {
          setIsLoading(false);
        }
      }
      loadInsights();
    }, [isAuthenticated, user?.id])
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!insights) {
    return null;
  }

  const maxWeeklyCarbs = Math.max(...insights.weeklyCarbs.map((d) => d.carbs), 1);
  const hasData = insights.totalScans > 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statsRow}>
        <StatCard
          icon="zap"
          label="Days Active"
          value={insights.streakDays}
          primaryColor={theme.primary}
        />
        <StatCard
          icon="camera"
          label="Total Scans"
          value={insights.totalScans}
          primaryColor={theme.primary}
        />
        <StatCard
          icon="activity"
          label="Avg Daily"
          value={`${insights.avgCarbs}g`}
          primaryColor={theme.primary}
        />
      </View>

      {insights.trend ? (
        <Card elevation={1} style={styles.trendCard}>
          <View style={styles.trendRow}>
            <Feather 
              name={insights.trend.direction === "up" ? "trending-up" : insights.trend.direction === "down" ? "trending-down" : "minus"} 
              size={24} 
              color={insights.trend.direction === "up" ? theme.error : insights.trend.direction === "down" ? theme.success : theme.textSecondary} 
            />
            <View>
              <ThemedText type="body">
                {insights.trend.direction === "up" ? "Carbs are up" : insights.trend.direction === "down" ? "Carbs are down" : "Carbs are steady"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {Math.abs(insights.trend.percentageChange)}% compared to last week
              </ThemedText>
            </View>
          </View>
        </Card>
      ) : null}

      {!hasData ? (
        <Card elevation={1} style={styles.emptyCard}>
          <Feather name="bar-chart-2" size={48} color={theme.textSecondary} />
          <ThemedText type="h4" style={styles.emptyTitle}>
            No Data Yet
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            Start scanning your meals to see your nutrition insights here!
          </ThemedText>
        </Card>
      ) : (
        <>
          <Card elevation={1} style={styles.chartCard}>
            <ThemedText type="h4">Weekly Carbs</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}
            >
              Your carb intake this week
            </ThemedText>
            <BarChart
              data={insights.weeklyCarbs}
              maxValue={maxWeeklyCarbs}
              primaryColor={theme.primary}
            />
          </Card>

          {insights.mealTimeBreakdown ? (
            <Card elevation={1} style={styles.chartCard}>
              <ThemedText type="h4">Carbs by Meal Time</ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}
              >
                Carbs distributed by time of day
              </ThemedText>
              <MealTimeChart
                data={insights.mealTimeBreakdown}
                primaryColor={theme.primary}
              />
            </Card>
          ) : null}
        </>
      )}

      <Card elevation={1} style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Feather name="info" size={20} color={theme.primary} />
          <ThemedText type="h4">Tip of the Day</ThemedText>
        </View>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Try to spread your carb intake evenly throughout the day to maintain
          stable blood sugar levels. Aim for 45-60g of carbs per meal.
        </ThemedText>
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
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  trendCard: {
    marginBottom: Spacing.lg,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  chartCard: {
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    height: 160,
    justifyContent: "flex-end",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
  },
  barWrapper: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  bar: {
    borderRadius: BorderRadius.xs,
  },
  barLabel: {
    fontSize: 10,
  },
  mealTimeContainer: {
    gap: Spacing.lg,
  },
  mealTimeItem: {
    gap: Spacing.sm,
  },
  mealTimeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mealTimeBar: {
    height: 8,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    overflow: "hidden",
  },
  mealTimeProgress: {
    height: "100%",
    borderRadius: 4,
  },
  mealTimeValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tipsCard: {
    gap: Spacing.md,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginTop: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
  },
});
