// ============================================
// UniSage Mobile — WelcomeHeader Component
// ============================================

import { View, Text, useColorScheme } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { format } from "date-fns";
import { COLORS, THEMES } from "@/lib/constants";
import { getGreeting } from "@/lib/utils";

interface WelcomeHeaderProps {
  name: string;
}

export function WelcomeHeader({ name }: WelcomeHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;

  const firstName = name.split(" ")[0];
  const translateY = useSharedValue(12);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 12, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 350 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={containerStyle} className="pt-4 pb-2">
      <View className="flex-row items-end justify-between gap-4">
        <View className="flex-1">
          <View
            style={{
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(59,121,224,0.2)"
                  : COLORS.brand[50],
            }}
            className="self-start rounded-full px-3 py-1 mb-3"
          >
            <Text
              style={{ color: theme.primary }}
              className="text-xs font-semibold uppercase tracking-[0.2em]"
            >
              {getGreeting()}
            </Text>
          </View>
          <Text className="text-3xl font-bold" style={{ color: theme.text }}>
            Welcome back, {firstName}! 👋
          </Text>
          <Text className="mt-2 text-sm" style={{ color: theme.textMuted }}>
            {format(new Date(), "EEEE, MMM d")}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          className="rounded-3xl px-4 py-3 shadow-soft"
        >
          <Text
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: theme.textMuted }}
          >
            Focus
          </Text>
          <Text
            className="mt-1 text-sm font-semibold"
            style={{ color: theme.text }}
          >
            Keep going
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
