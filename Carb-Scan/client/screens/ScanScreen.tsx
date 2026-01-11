import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getRandomEncouragingMessage, generateUniqueId } from "@/utils/mockApi";
import { carbscanAPI, APIError } from "@/utils/api";
import { saveMeal } from "@/utils/storage";
import { ScanResult, Meal } from "@/types";

type ScanNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { isAuthenticated, decrementScans, subscription } = useAuth();
  const navigation = useNavigation<ScanNavigationProp>();

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const captureScale = useSharedValue(1);
  const loadingRotation = useSharedValue(0);

  useEffect(() => {
    if (isAnalyzing) {
      loadingRotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );

      const interval = setInterval(() => {
        setLoadingMessage(getRandomEncouragingMessage());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const captureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const handleCapture = async () => {
    if (!isAuthenticated) {
      navigation.navigate("Login");
      return;
    }

    if (subscription.scansRemaining <= 0) {
      Alert.alert(
        "No Scans Remaining",
        "You've used all your scans for today. Upgrade to get more scans.",
        [{ text: "OK" }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    captureScale.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        if (photo) {
          setCapturedImage(photo.uri);
          analyzeImage(photo.base64 || "");
        }
      } catch (error) {
        console.error("Failed to capture:", error);
      }
    }
  };

  const handlePickImage = async () => {
    if (!isAuthenticated) {
      navigation.navigate("Login");
      return;
    }

    if (subscription.scansRemaining <= 0) {
      Alert.alert(
        "No Scans Remaining",
        "You've used all your scans for today. Upgrade to get more scans.",
        [{ text: "OK" }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      analyzeImage(result.assets[0].base64 || "");
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    setLoadingMessage(getRandomEncouragingMessage());

    try {
      const response = await carbscanAPI.analyze.analyzeImage(base64);
      
      const result: ScanResult = {
        totalCarbs: response.analysis.carbEstimate,
        foodItems: [
          {
            name: response.analysis.compositeItemName,
            carbs: response.analysis.carbEstimate,
            portion: "1 serving",
          },
        ],
        nutrition: {
          calories: 0,
          protein: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
        },
        confidence: response.analysis.confidenceLevel,
      };
      
      setScanResult(result);
      decrementScans();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Analysis failed:", error);
      
      if (error instanceof APIError) {
        if (error.code === "NO_SCANS_REMAINING") {
          Alert.alert(
            "No Scans Remaining",
            error.message,
            [{ text: "OK", onPress: handleReset }]
          );
        } else {
          Alert.alert("Analysis Failed", error.message, [{ text: "OK", onPress: handleReset }]);
        }
      } else {
        Alert.alert(
          "Analysis Failed",
          "Failed to analyze the image. Please try again.",
          [{ text: "OK", onPress: handleReset }]
        );
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!scanResult || !capturedImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const meal: Meal = {
      id: generateUniqueId(),
      imageUri: capturedImage,
      totalCarbs: scanResult.totalCarbs,
      foodItems: scanResult.foodItems,
      nutrition: scanResult.nutrition,
      confidence: scanResult.confidence,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    try {
      await saveMeal(meal);
      Alert.alert("Meal Saved", "Your meal has been logged successfully.", [
        { text: "OK" },
      ]);
      handleReset();
    } catch (error) {
      console.error("Failed to save meal:", error);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setScanResult(null);
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.permissionContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <Feather name="camera-off" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.permissionTitle}>
          Camera Access Required
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.permissionText, { color: theme.textSecondary }]}
        >
          CarbScan needs camera access to scan and analyze your food.
        </ThemedText>
        <Button onPress={requestPermission}>Enable Camera</Button>
      </View>
    );
  }

  if (capturedImage && (isAnalyzing || scanResult)) {
    return (
      <View
        style={[
          styles.resultContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <ScrollView
          style={styles.resultScroll}
          contentContainerStyle={styles.resultContent}
          showsVerticalScrollIndicator={false}
        >
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />

          {isAnalyzing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText type="body" style={styles.loadingText}>
                {loadingMessage}
              </ThemedText>
            </View>
          ) : scanResult ? (
            <View style={styles.resultsContainer}>
              <Card elevation={1} style={styles.carbCard}>
                <View style={styles.carbHeader}>
                  <ThemedText
                    style={[styles.carbNumber, { color: theme.primary }]}
                  >
                    {scanResult.totalCarbs}
                  </ThemedText>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>
                    grams of carbs
                  </ThemedText>
                </View>
                <View style={styles.confidenceBadge}>
                  <Feather name="check-circle" size={14} color={theme.success} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.success }}
                  >
                    {scanResult.confidence}% confidence
                  </ThemedText>
                </View>
              </Card>

              <Card elevation={1} style={styles.foodCard}>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  Food Items Detected
                </ThemedText>
                {scanResult.foodItems.map((item, index) => (
                  <View key={index} style={styles.foodItem}>
                    <View style={styles.foodItemInfo}>
                      <ThemedText type="body">{item.name}</ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                      >
                        {item.portion}
                      </ThemedText>
                    </View>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {item.carbs}g
                    </ThemedText>
                  </View>
                ))}
              </Card>

              <Card elevation={1} style={styles.nutritionCard}>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  Nutrition Breakdown
                </ThemedText>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <ThemedText type="h4">{scanResult.nutrition.calories}</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Calories
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionItem}>
                    <ThemedText type="h4">{scanResult.nutrition.protein}g</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Protein
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionItem}>
                    <ThemedText type="h4">{scanResult.nutrition.fat}g</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Fat
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionItem}>
                    <ThemedText type="h4">{scanResult.nutrition.fiber}g</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Fiber
                    </ThemedText>
                  </View>
                </View>
              </Card>

              <View style={styles.actionButtons}>
                <Button onPress={handleSaveMeal}>Save Meal</Button>
                <Pressable
                  onPress={handleReset}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <ThemedText type="body" style={{ color: theme.primary }}>
                    Scan Another
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View
          style={[styles.cameraOverlay, { paddingTop: insets.top + Spacing.lg }]}
        >
          <View style={styles.scansCounter}>
            <ThemedText type="caption" style={styles.scansText}>
              {subscription.scansRemaining} scans remaining
            </ThemedText>
          </View>

          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <ThemedText type="body" style={styles.instructionText}>
            Position your food in the frame
          </ThemedText>
        </View>

        <View
          style={[styles.controlsContainer, { paddingBottom: tabBarHeight + Spacing.xl }]}
        >
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [
              styles.galleryButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="image" size={24} color="#fff" />
          </Pressable>

          <Animated.View style={captureAnimatedStyle}>
            <Pressable onPress={handleCapture} style={styles.captureButton}>
              <View style={styles.captureButtonInner} />
            </Pressable>
          </Animated.View>

          <View style={styles.placeholderButton} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scansCounter: {
    position: "absolute",
    top: Spacing["5xl"],
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  scansText: {
    color: "#fff",
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#fff",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 16,
  },
  instructionText: {
    color: "#fff",
    marginTop: Spacing.xl,
    textAlign: "center",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: Spacing["2xl"],
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderButton: {
    width: 48,
    height: 48,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  permissionTitle: {
    marginTop: Spacing.lg,
  },
  permissionText: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  resultContainer: {
    flex: 1,
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  capturedImage: {
    width: "100%",
    height: 250,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.lg,
  },
  loadingText: {
    textAlign: "center",
  },
  resultsContainer: {
    gap: Spacing.lg,
  },
  carbCard: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
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
  foodCard: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  foodItemInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  nutritionCard: {
    gap: Spacing.md,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
  },
  nutritionItem: {
    flex: 1,
    minWidth: "40%",
    alignItems: "center",
    gap: Spacing.xs,
  },
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
  },
});
