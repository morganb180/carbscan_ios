import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OnboardingPromiseScreen from "@/screens/onboarding/OnboardingPromiseScreen";
import FirstScanCameraScreen from "@/screens/onboarding/FirstScanCameraScreen";
import ScanResultsScreen, { ScanResult } from "@/screens/onboarding/ScanResultsScreen";
import SaveGateModal from "@/screens/onboarding/SaveGateModal";
import NotificationsPermissionScreen from "@/screens/onboarding/NotificationsPermissionScreen";
import OnboardingHomeScreen from "@/screens/onboarding/OnboardingHomeScreen";
import DemoScreen from "@/screens/onboarding/DemoScreen";

import { useScreenOptions } from "@/hooks/useScreenOptions";

export type OnboardingStackParamList = {
  Promise: undefined;
  Camera: undefined;
  Results: {
    imageUri?: string;
    useSample?: boolean;
  };
  SaveGate: {
    result: ScanResult;
  };
  NotificationsPermission: undefined;
  Home: undefined;
  Demo: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="Promise" component={OnboardingPromiseScreen} />
      <Stack.Screen name="Camera" component={FirstScanCameraScreen} />
      <Stack.Screen name="Results" component={ScanResultsScreen} />
      <Stack.Screen
        name="SaveGate"
        component={SaveGateModal}
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen name="NotificationsPermission" component={NotificationsPermissionScreen} />
      <Stack.Screen name="Home" component={OnboardingHomeScreen} />
      <Stack.Screen name="Demo" component={DemoScreen} />
    </Stack.Navigator>
  );
}
