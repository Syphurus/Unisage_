// ============================================
// UniSage Mobile — StatCard Component
// ============================================

import { View, Text, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, THEMES } from "@/lib/constants";

interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  large?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  color,
  large = false,
}: StatCardProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        shadowColor: colorScheme === "dark" ? theme.primary : COLORS.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: colorScheme === "dark" ? 0.12 : 0.06,
        shadowRadius: 16,
        elevation: 3,
      }}
      className={`rounded-3xl flex-1 ${large ? "p-4" : "p-3"}`}
    >
      <View
        style={{ backgroundColor: `${color}18` }}
        className="w-10 h-10 rounded-2xl items-center justify-center mb-2"
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text
        className={`font-bold ${large ? "text-xl" : "text-lg"}`}
        style={{ color: theme.text }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
        {label}
      </Text>
    </View>
  );
}
