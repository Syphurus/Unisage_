// ============================================
// UniSage Mobile — StreakCard Component
// ============================================

import { View, Text, useColorScheme } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { COLORS, THEMES } from "@/lib/constants";

interface StreakCardProps {
  streak: number;
}

export function StreakCard({ streak }: StreakCardProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;

  const translateY = useSharedValue(14);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 12, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 350 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const message =
    streak === 0
      ? "Start studying to build your streak!"
      : streak === 1
        ? "Great start! Keep it going!"
        : streak < 7
          ? "You're on fire! Keep it up!"
          : "Incredible consistency! 🎉";

  return (
    <Animated.View
      style={animatedStyle}
      className="relative mt-3 overflow-hidden rounded-[28px] p-4"
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: streak > 0 ? COLORS.amber[500] : theme.border,
        }}
      />
      <View
        style={{
          backgroundColor:
            streak > 0
              ? colorScheme === "dark"
                ? "rgba(233,168,29,0.12)"
                : "#FFF7ED"
              : theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        }}
        className="rounded-[24px] p-4"
      >
        <View className="flex-row items-center">
          <Text className="mr-2 text-3xl">🔥</Text>
          <View className="flex-1">
            <Text className="text-lg font-bold" style={{ color: theme.text }}>
              {streak > 0 ? `${streak}-day streak` : "No streak yet"}
            </Text>
            <Text className="mt-0.5 text-sm" style={{ color: theme.textMuted }}>
              {message}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
