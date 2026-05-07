// ============================================
// UniSage Mobile — Card Component
// ============================================

import { View, useColorScheme, type ViewStyle } from "react-native";
import { COLORS, THEMES } from "@/lib/constants";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({
  children,
  className = "",
  style,
  padded = true,
}: CardProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;

  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: colorScheme === "dark" ? theme.primary : COLORS.black,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: colorScheme === "dark" ? 0.14 : 0.08,
          shadowRadius: 18,
          elevation: 4,
        },
        style,
      ]}
      className={`${padded ? "p-4" : ""} ${className}`}
    >
      {children}
    </View>
  );
}
