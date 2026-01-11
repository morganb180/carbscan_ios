import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SkeletonRowProps {
  showThumbnail?: boolean;
  height?: number;
}

export function SkeletonRow({ showThumbnail = true, height = 72 }: SkeletonRowProps) {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.7]),
  }));

  return (
    <View style={[styles.container, { height }]}>
      {showThumbnail && (
        <Animated.View
          style={[
            styles.thumbnail,
            animatedStyle,
            { backgroundColor: theme.surfaceAlt },
          ]}
        />
      )}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.titleLine,
            animatedStyle,
            { backgroundColor: theme.surfaceAlt },
          ]}
        />
        <Animated.View
          style={[
            styles.subtitleLine,
            animatedStyle,
            { backgroundColor: theme.surfaceAlt },
          ]}
        />
      </View>
      <Animated.View
        style={[
          styles.badge,
          animatedStyle,
          { backgroundColor: theme.surfaceAlt },
        ]}
      />
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.r1,
    marginRight: Spacing.s3,
  },
  content: {
    flex: 1,
    gap: Spacing.s2,
  },
  titleLine: {
    height: 16,
    borderRadius: 4,
    width: "60%",
  },
  subtitleLine: {
    height: 12,
    borderRadius: 4,
    width: "40%",
  },
  badge: {
    width: 50,
    height: 24,
    borderRadius: BorderRadius.r1,
    marginLeft: Spacing.s3,
  },
  list: {
    gap: Spacing.s2,
  },
});
