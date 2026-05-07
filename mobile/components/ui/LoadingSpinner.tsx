// ============================================
// UniSage Mobile — LoadingSpinner Component
// ============================================

import { View, ActivityIndicator, Text, useColorScheme } from "react-native";
import { THEMES } from "@/lib/constants";

interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  text,
  fullScreen = true,
}: LoadingSpinnerProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;

  return (
    <View
      className={`items-center justify-center ${fullScreen ? "flex-1" : "py-12"}`}
      style={{ backgroundColor: fullScreen ? theme.background : "transparent" }}
    >
      <View
        style={{ backgroundColor: theme.surfaceSubtle }}
        className="rounded-[28px] p-4 shadow-soft"
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
      {text && (
        <Text className="mt-3 text-sm" style={{ color: theme.textMuted }}>
          {text}
        </Text>
      )}
    </View>
  );
}
