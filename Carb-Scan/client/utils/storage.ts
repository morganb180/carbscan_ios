import AsyncStorage from "@react-native-async-storage/async-storage";
import { Meal, ChatMessage } from "@/types";

const MEALS_STORAGE_KEY = "@carbscan_meals";
const CHAT_STORAGE_KEY = "@carbscan_chat";
const PENDING_SYNC_KEY = "@carbscan_pending_sync";

export async function getMeals(): Promise<Meal[]> {
  try {
    const data = await AsyncStorage.getItem(MEALS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to get meals:", error);
    return [];
  }
}

export async function saveMeal(meal: Meal): Promise<void> {
  try {
    const meals = await getMeals();
    meals.unshift(meal);
    await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(meals));
  } catch (error) {
    console.error("Failed to save meal:", error);
    throw error;
  }
}

export async function deleteMeal(mealId: string): Promise<void> {
  try {
    const meals = await getMeals();
    const filtered = meals.filter((m) => m.id !== mealId);
    await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete meal:", error);
    throw error;
  }
}

export async function getMealById(mealId: string): Promise<Meal | null> {
  try {
    const meals = await getMeals();
    return meals.find((m) => m.id === mealId) || null;
  } catch (error) {
    console.error("Failed to get meal:", error);
    return null;
  }
}

export async function getChatMessages(): Promise<ChatMessage[]> {
  try {
    const data = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to get chat messages:", error);
    return [];
  }
}

export async function saveChatMessage(message: ChatMessage): Promise<void> {
  try {
    const messages = await getChatMessages();
    messages.push(message);
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error("Failed to save chat message:", error);
    throw error;
  }
}

export async function clearChatMessages(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear chat messages:", error);
    throw error;
  }
}

export async function getPendingSyncMeals(): Promise<Meal[]> {
  try {
    const data = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to get pending sync meals:", error);
    return [];
  }
}

export async function addPendingSyncMeal(meal: Meal): Promise<void> {
  try {
    const pending = await getPendingSyncMeals();
    pending.push(meal);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error("Failed to add pending sync meal:", error);
    throw error;
  }
}

export async function clearPendingSyncMeals(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  } catch (error) {
    console.error("Failed to clear pending sync meals:", error);
    throw error;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      MEALS_STORAGE_KEY,
      CHAT_STORAGE_KEY,
      PENDING_SYNC_KEY,
    ]);
  } catch (error) {
    console.error("Failed to clear all data:", error);
    throw error;
  }
}
