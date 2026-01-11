import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { BottomSheet } from "@/components/BottomSheet";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { analytics } from "@/lib/analytics";
import type { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Camera">;

export default function FirstScanCameraScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [showPermissionPrimer, setShowPermissionPrimer] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { startScan, setCameraPermission } = useOnboardingStore();

  const captureScale = useSharedValue(1);

  useEffect(() => {
    analytics.screenViewed("Camera");
  }, []);

  useEffect(() => {
    if (permission) {
      if (permission.granted) {
        setCameraPermission("granted");
        startScan();
      } else if (permission.status === "undetermined") {
        setShowPermissionPrimer(true);
      } else {
        setCameraPermission("denied");
      }
    }
  }, [permission, setCameraPermission, startScan]);

  const handleRequestPermission = useCallback(async () => {
    setShowPermissionPrimer(false);
    analytics.permissionPrompted("camera");
    const result = await requestPermission();
    analytics.permissionResult("camera", result.granted ? "granted" : "denied");

    if (result.granted) {
      setCameraPermission("granted");
      startScan();
    } else {
      setCameraPermission("denied");
    }
  }, [requestPermission, setCameraPermission, startScan]);

  const handleOpenSettings = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.log("Could not open settings");
      }
    }
  }, []);

  const handleSamplePhoto = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.ctaTapped("sample_photo", "Camera");
    setShowPermissionPrimer(false);
    navigation.replace("Results", { useSample: true });
  }, [navigation]);

  const compressImage = useCallback(async (uri: string): Promise<string> => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.error("Failed to compress image:", error);
      return uri;
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing || isProcessing) return;

    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    captureScale.value = withSpring(0.9, { damping: 10, stiffness: 400 });
    AccessibilityInfo.announceForAccessibility("Photo captured. Analyzing.");

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setIsProcessing(true);
        analytics.scanPhotoCaptured();
        
        const compressedUri = await compressImage(photo.uri);
        navigation.replace("Results", { imageUri: compressedUri });
      }
    } catch (error) {
      console.error("Failed to capture:", error);
      setIsCapturing(false);
      setIsProcessing(false);
    } finally {
      captureScale.value = withSpring(1, { damping: 10, stiffness: 400 });
    }
  }, [isCapturing, isProcessing, captureScale, compressImage, navigation]);

  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsProcessing(true);
      startScan();
      analytics.scanPhotoCaptured();
      
      const compressedUri = await compressImage(result.assets[0].uri);
      navigation.replace("Results", { imageUri: compressedUri });
    }
  }, [startScan, compressImage, navigation]);

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  if (!permission.granted && !showPermissionPrimer) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.screenBg }]}>
        <View
          style={[
            styles.permissionDeniedContent,
            {
              paddingTop: insets.top + Spacing.s6,
              paddingBottom: insets.bottom + Spacing.s6,
            },
          ]}
        >
          <View style={styles.permissionDeniedCenter}>
            <View style={[styles.iconContainer, { backgroundColor: theme.accentSoft }]}>
              <Feather name="camera-off" size={48} color={theme.accent} />
            </View>
            <ThemedText style={[styles.permissionTitle, { color: theme.textPrimary }]}>
              Camera access needed
            </ThemedText>
            <ThemedText
              style={[styles.permissionText, { color: theme.textSecondary }]}
            >
              Enable camera in Settings to scan meals.
            </ThemedText>

            {Platform.OS !== "web" && (
              <Button
                variant="primary"
                size="large"
                onPress={handleOpenSettings}
                style={styles.settingsButton}
              >
                <View style={styles.buttonContent}>
                  <Feather name="settings" size={18} color={theme.textOnAccent} />
                  <ThemedText style={{ color: theme.textOnAccent, ...Typography.button }}>
                    Open Settings
                  </ThemedText>
                </View>
              </Button>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.fallbackButton, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleSamplePhoto}
            accessibilityRole="button"
            accessibilityLabel="Try with a sample photo"
          >
            <Feather name="image" size={18} color={theme.accent} />
            <ThemedText style={{ color: theme.accent, ...Typography.body }}>
              Try with a sample photo
            </ThemedText>
          </Pressable>
        </View>

        <BottomSheet
          visible={showPermissionPrimer}
          onDismiss={() => setShowPermissionPrimer(false)}
          title="Camera access needed"
          body="CarbScan uses your camera to estimate carbs from photos."
          primaryLabel="Continue"
          onPrimaryPress={handleRequestPermission}
          secondaryLabel="Try sample photo"
          onSecondaryPress={handleSamplePhoto}
        />
      </ThemedView>
    );
  }

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <ThemedText style={styles.processingText}>
            Processing photo...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      <View style={[styles.overlay, { paddingTop: insets.top + Spacing.s4 }]}>
        <View style={styles.topOverlay}>
          <ThemedText style={styles.overlayText}>
            Center your meal in the frame
          </ThemedText>
          <ThemedText style={styles.overlayHint}>
            Plates, bowls, snacks, and packaged food all work
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.controls,
          { paddingBottom: insets.bottom + Spacing.s6 },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.galleryButton, { opacity: pressed ? 0.6 : 1 }]}
          onPress={handlePickImage}
          accessibilityLabel="Choose from gallery"
          accessibilityRole="button"
        >
          <Feather name="image" size={24} color="#FFFFFF" />
        </Pressable>

        <Animated.View style={captureButtonStyle}>
          <Pressable
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isCapturing}
            accessibilityLabel="Take photo"
            accessibilityRole="button"
            accessibilityHint="Captures a photo of your meal for analysis"
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
        </Animated.View>

        <View style={styles.placeholderButton} />
      </View>

      <BottomSheet
        visible={showPermissionPrimer}
        onDismiss={() => setShowPermissionPrimer(false)}
        title="Camera access needed"
        body="CarbScan uses your camera to estimate carbs from photos."
        primaryLabel="Continue"
        onPrimaryPress={handleRequestPermission}
        secondaryLabel="Try sample photo"
        onSecondaryPress={handleSamplePhoto}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
  },
  topOverlay: {
    alignItems: "center",
    paddingHorizontal: Spacing.s6,
    gap: Spacing.s1,
  },
  overlayText: {
    ...Typography.h2,
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayHint: {
    ...Typography.caption,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: Spacing.s6,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
  },
  placeholderButton: {
    width: 48,
    height: 48,
  },
  processingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    gap: Spacing.s4,
  },
  processingText: {
    ...Typography.body,
    color: "#FFFFFF",
  },
  permissionDeniedContent: {
    flex: 1,
    paddingHorizontal: Spacing.s6,
    justifyContent: "space-between",
  },
  permissionDeniedCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.s3,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.r4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.s4,
  },
  permissionTitle: {
    ...Typography.h1,
    textAlign: "center",
  },
  permissionText: {
    ...Typography.body,
    textAlign: "center",
    maxWidth: 280,
  },
  settingsButton: {
    marginTop: Spacing.s4,
    minWidth: 200,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
  },
  fallbackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.s2,
    paddingVertical: Spacing.s3,
    minHeight: 44,
  },
});
