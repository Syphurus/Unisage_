// ============================================
// UniSage Mobile — ScreenWrapper Component
// ============================================

import { View, useColorScheme, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, THEMES } from "@/lib/constants";

interface ScreenWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
  bg?: string;
}

export function ScreenWrapper({
  children,
  className = "",
  style,
  edges = ["top"],
  bg,
}: ScreenWrapperProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;
  const backgroundColor = bg ?? theme.background;

  return (
    <SafeAreaView
      className={`flex-1 overflow-hidden ${className}`}
      style={[{ backgroundColor }, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}
