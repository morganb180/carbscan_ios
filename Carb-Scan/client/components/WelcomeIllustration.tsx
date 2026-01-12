import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";

import HonestPlateSvg from "@assets/illustrations/honest_plate.svg";

interface WelcomeIllustrationProps {
  maxWidth?: number;
}

export function WelcomeIllustration({ maxWidth = 240 }: WelcomeIllustrationProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Responsive sizing: use maxWidth but don't exceed 60% of screen width
  const size = Math.min(maxWidth, screenWidth * 0.6);

  return (
    <View style={styles.container} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <HonestPlateSvg width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
