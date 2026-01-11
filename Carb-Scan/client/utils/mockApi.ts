import { ScanResult, ChatMessage, DailyCarbs, MealTimeBreakdown } from "@/types";

const encouragingMessages = [
  "Analyzing your meal...",
  "Counting those carbs...",
  "Almost there...",
  "Identifying food items...",
  "Calculating nutrition...",
  "Just a moment...",
];

export function getRandomEncouragingMessage(): string {
  return encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
}

export async function analyzeFoodImage(_imageBase64: string): Promise<ScanResult> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const mockResults: ScanResult[] = [
    {
      totalCarbs: 45,
      foodItems: [
        { name: "Grilled Chicken Breast", carbs: 0, portion: "6 oz" },
        { name: "Brown Rice", carbs: 35, portion: "1 cup" },
        { name: "Steamed Broccoli", carbs: 10, portion: "1 cup" },
      ],
      nutrition: {
        calories: 420,
        protein: 38,
        fat: 8,
        fiber: 5,
        sugar: 3,
      },
      confidence: 92,
    },
    {
      totalCarbs: 62,
      foodItems: [
        { name: "Pasta with Marinara", carbs: 52, portion: "2 cups" },
        { name: "Parmesan Cheese", carbs: 1, portion: "2 tbsp" },
        { name: "Garlic Bread", carbs: 9, portion: "1 slice" },
      ],
      nutrition: {
        calories: 580,
        protein: 18,
        fat: 15,
        fiber: 4,
        sugar: 8,
      },
      confidence: 88,
    },
    {
      totalCarbs: 28,
      foodItems: [
        { name: "Caesar Salad", carbs: 8, portion: "2 cups" },
        { name: "Grilled Salmon", carbs: 0, portion: "5 oz" },
        { name: "Croutons", carbs: 12, portion: "1/4 cup" },
        { name: "Caesar Dressing", carbs: 2, portion: "2 tbsp" },
        { name: "Lemon Wedge", carbs: 6, portion: "1 piece" },
      ],
      nutrition: {
        calories: 380,
        protein: 32,
        fat: 22,
        fiber: 3,
        sugar: 4,
      },
      confidence: 95,
    },
    {
      totalCarbs: 78,
      foodItems: [
        { name: "Cheeseburger", carbs: 35, portion: "1 burger" },
        { name: "French Fries", carbs: 43, portion: "medium" },
      ],
      nutrition: {
        calories: 890,
        protein: 35,
        fat: 42,
        fiber: 4,
        sugar: 8,
      },
      confidence: 91,
    },
  ];

  return mockResults[Math.floor(Math.random() * mockResults.length)];
}

export async function sendChatMessage(message: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const responses: Record<string, string> = {
    default:
      "I can help you with carb counting, meal planning, and nutrition questions. What would you like to know?",
    carbs:
      "Carbohydrates are one of the main nutrients in food. For people with diabetes, tracking carbs helps manage blood sugar levels. A typical meal might contain 45-60g of carbs.",
    meal:
      "For a balanced meal, aim for: protein (palm-sized portion), vegetables (half your plate), and carbs (quarter of plate). This helps maintain steady blood sugar.",
    snack:
      "Great low-carb snack options include: nuts (5g carbs per handful), cheese (1g carbs), hard-boiled eggs (0g carbs), or celery with peanut butter (4g carbs).",
    breakfast:
      "Diabetes-friendly breakfast ideas: Greek yogurt with berries (15g carbs), eggs with avocado (5g carbs), or oatmeal with nuts (30g carbs).",
  };

  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("carb")) return responses.carbs;
  if (lowerMessage.includes("meal") || lowerMessage.includes("plan"))
    return responses.meal;
  if (lowerMessage.includes("snack")) return responses.snack;
  if (lowerMessage.includes("breakfast")) return responses.breakfast;

  return responses.default;
}

export function generateMockInsights(): {
  weeklyCarbs: DailyCarbs[];
  monthlyTrend: DailyCarbs[];
  mealTimeBreakdown: MealTimeBreakdown;
  streakDays: number;
  totalScans: number;
} {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  const weeklyCarbs: DailyCarbs[] = daysOfWeek.map((day, i) => ({
    date: day,
    carbs: Math.floor(Math.random() * 150) + 100,
    mealCount: Math.floor(Math.random() * 4) + 1,
  }));

  const monthlyTrend: DailyCarbs[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      carbs: Math.floor(Math.random() * 150) + 100,
      mealCount: Math.floor(Math.random() * 4) + 1,
    };
  });

  return {
    weeklyCarbs,
    monthlyTrend,
    mealTimeBreakdown: {
      breakfast: 35,
      lunch: 55,
      dinner: 65,
      snacks: 25,
    },
    streakDays: 7,
    totalScans: 42,
  };
}

export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
