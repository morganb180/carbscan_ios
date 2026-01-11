export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: "free" | "essentials" | "pro";
  avatarUrl?: string;
}

export interface Subscription {
  tier: "free" | "essentials" | "pro";
  scansRemaining: number;
  scansTotal: number;
  historyDays: number;
  chatLimit: number;
  renewalDate?: string;
}

export interface FoodItem {
  name: string;
  carbs: number;
  portion: string;
}

export interface NutritionBreakdown {
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export interface Meal {
  id: string;
  imageUri: string;
  totalCarbs: number;
  foodItems: FoodItem[];
  nutrition: NutritionBreakdown;
  confidence: number;
  timestamp: string;
  synced: boolean;
}

export interface MealSummary {
  id: string;
  name: string;
  totalCarbs: number;
  confidenceLevel: string;
  timestamp: string;
  isApiOnly: true;
}

export type MealRecord = Meal | MealSummary;

export function isMealSummary(meal: MealRecord): meal is MealSummary {
  return "isApiOnly" in meal && meal.isApiOnly === true;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DailyCarbs {
  date: string;
  carbs: number;
  mealCount: number;
}

export interface MealTimeBreakdown {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
}

export interface ScanResult {
  totalCarbs: number;
  foodItems: FoodItem[];
  nutrition: NutritionBreakdown;
  confidence: number;
}
