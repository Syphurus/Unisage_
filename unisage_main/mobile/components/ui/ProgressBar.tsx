// ============================================
// UniSage Mobile — ProgressBar Component
// ============================================

import { View, useColorScheme, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";
import { COLORS, THEMES } from "@/lib/constants";

interface ProgressBarProps {
  value: number; // 0-100
  height?: number;
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
  animated?: boolean;
}

export function ProgressBar({
  value,
  height = 8,
  color,
  bgColor,
  style,
  animated = true,
}: ProgressBarProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;
  const progressColor = color ?? theme.primary;
  const progressBgColor = bgColor ?? theme.border;

  const progress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.min(Math.max(value, 0), 100);
    if (animated) {
      progress.value = withTiming(clamped, { duration: 600 });
    } else {
      progress.value = clamped;
    }
  }, [value, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View
      style={[
        {
          height,
          backgroundColor: progressBgColor,
          borderRadius: height / 2,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            height,
            backgroundColor: progressColor,
            borderRadius: height / 2,
            shadowColor: progressColor,
            shadowOpacity: 0.2,
            shadowRadius: 8,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
