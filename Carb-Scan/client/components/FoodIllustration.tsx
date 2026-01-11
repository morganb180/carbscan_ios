import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

interface FoodIllustrationProps {
  size?: number;
  strokeWidth?: number;
  accentColor?: string;
}

export function FoodIllustration({
  size = 200,
  strokeWidth = 1.5,
  accentColor,
}: FoodIllustrationProps) {
  const { theme } = useTheme();
  const strokeColor = theme.textSecondary;
  const accent = accentColor || theme.accent;

  const drawProgress = useSharedValue(0);
  const breatheValue = useSharedValue(0);

  useEffect(() => {
    drawProgress.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    breatheValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const plateAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(drawProgress.value, [0, 1], [400, 0]);
    return {
      strokeDashoffset,
    };
  });

  const contentAnimatedProps = useAnimatedProps(() => {
    const translateY = interpolate(breatheValue.value, [0, 1], [0, -2]);
    return {
      transform: [{ translateY }],
    };
  });

  const forkAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      drawProgress.value,
      [0, 0.5, 1],
      [200, 200, 0]
    );
    return {
      strokeDashoffset,
    };
  });

  return (
    <View
      style={styles.container}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <AnimatedPath
          d="M 30 100 Q 30 140 100 140 Q 170 140 170 100 Q 170 60 100 60 Q 30 60 30 100"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={400}
          animatedProps={plateAnimatedProps}
        />

        <AnimatedG animatedProps={contentAnimatedProps}>
          <Circle
            cx="80"
            cy="95"
            r="15"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={0.8}
          />
          <Circle
            cx="110"
            cy="100"
            r="12"
            fill="none"
            stroke={accent}
            strokeWidth={strokeWidth}
            opacity={0.9}
          />
          <Circle
            cx="95"
            cy="115"
            r="10"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={0.7}
          />
          <Path
            d="M 125 85 Q 135 80 140 90 Q 145 100 135 105"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.6}
          />
        </AnimatedG>

        <AnimatedPath
          d="M 155 45 L 155 70 M 150 45 L 150 60 M 160 45 L 160 60 M 155 70 L 155 80"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={200}
          animatedProps={forkAnimatedProps}
          opacity={0.5}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
