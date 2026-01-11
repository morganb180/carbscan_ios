import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import ChatScreen from "@/screens/ChatScreen";
import MealDetailScreen from "@/screens/MealDetailScreen";
import LoginScreen from "@/screens/LoginScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Chat: undefined;
  MealDetail: { mealId: string };
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = useOnboardingStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    if (useOnboardingStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const onboardingCompleted = useOnboardingStore((state) => state.onboardingCompleted);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!onboardingCompleted ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              presentation: "modal",
              headerTitle: "AI Chat",
            }}
          />
          <Stack.Screen
            name="MealDetail"
            component={MealDetailScreen}
            options={{
              presentation: "modal",
              headerTitle: "Meal Details",
            }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
