// ============================================
// UniSage Mobile — TodaysFocus Component
// ============================================

import { View, Text, Pressable, useColorScheme } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, THEMES } from "@/lib/constants";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { percentage, formatRelativeTime } from "@/lib/utils";
import type { Subject } from "@/lib/types";

interface TodaysFocusProps {
  subjects: Subject[];
}

export function TodaysFocus({ subjects }: TodaysFocusProps) {
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

  // Pick the most recently accessed subject, or the one with the most progress
  const focusSubject = subjects
    .filter((s) => s.last_accessed)
    .sort(
      (a, b) =>
        new Date(b.last_accessed!).getTime() -
        new Date(a.last_accessed!).getTime()
    )[0];

  if (!focusSubject) {
    return (
      <View
        className="rounded-2xl p-5 mt-4 shadow-sm"
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text className="text-center" style={{ color: theme.textMuted }}>
          Start studying a subject to see your focus here!
        </Text>
      </View>
    );
  }

  const progress = percentage(
    focusSubject.completed_units ?? 0,
    focusSubject.total_units
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/subject/${focusSubject.id}`);
  };

  return (
    <View className="mt-4">
      <Text className="text-lg font-bold mb-3" style={{ color: theme.text }}>
        Today's Focus
      </Text>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          className="rounded-[28px] p-5 active:opacity-90"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            shadowColor: colorScheme === "dark" ? theme.primary : COLORS.black,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: colorScheme === "dark" ? 0.12 : 0.08,
            shadowRadius: 20,
            elevation: 4,
            borderLeftWidth: 4,
            borderLeftColor: theme.primary,
            borderTopWidth: 1,
          }}
        >
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-4">
              <Text
                className="text-xs uppercase tracking-wider mb-1"
                style={{ color: theme.textMuted }}
              >
                Continue where you left off
              </Text>
              <Text
                className="text-lg font-bold"
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                {focusSubject.name}
              </Text>
              <Text
                className="text-sm mt-0.5"
                style={{ color: theme.textMuted }}
              >
                {focusSubject.code}
              </Text>
            </View>
            <View
              style={{
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(59,121,224,0.2)"
                    : COLORS.brand[50],
                borderColor: theme.border,
                borderWidth: 1,
              }}
              className="w-12 h-12 rounded-2xl items-center justify-center"
            >
              <Ionicons name="book" size={22} color={theme.primary} />
            </View>
          </View>
          {/* Progress */}
          <View className="mt-4">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-xs" style={{ color: theme.textMuted }}>
                {focusSubject.completed_units ?? 0}/{focusSubject.total_units}{" "}
                units
              </Text>
              <Text
                className="text-xs font-semibold"
                style={{ color: theme.primary }}
              >
                {progress}%
              </Text>
            </View>
            <ProgressBar value={progress} />
          </View>

          {/* CTA */}
          <View className="flex-row items-center mt-4">
            <View
              style={{ backgroundColor: theme.primary }}
              className="flex-row items-center px-4 py-2.5 rounded-2xl"
            >
              <Ionicons name="play" size={14} color={COLORS.white} />
              <Text className="text-white font-semibold text-sm ml-1.5">
                Continue Studying
              </Text>
            </View>
            <Text className="text-xs ml-3" style={{ color: theme.textMuted }}>
              Last: {formatRelativeTime(focusSubject.last_accessed)}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
