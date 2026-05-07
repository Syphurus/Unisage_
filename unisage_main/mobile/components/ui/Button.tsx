// ============================================
// UniSage Mobile — Button Component
// ============================================

import {
  Pressable,
  Text,
  ActivityIndicator,
  useColorScheme,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS, THEMES } from "@/lib/constants";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-2 px-4",
  md: "py-3 px-6",
  lg: "py-4 px-8",
};

const textSizes: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bgColor = getBgColor(variant, disabled, theme);
  const textColor = getTextColor(variant, theme);
  const borderStyle =
    variant === "outline" ? { borderWidth: 1, borderColor: theme.primary } : {};

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bgColor,
          opacity: disabled ? 0.5 : 1,
          ...borderStyle,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          shadowColor: colorScheme === "dark" ? theme.primary : COLORS.black,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity:
            variant === "outline" || variant === "ghost" ? 0 : 0.12,
          shadowRadius: 18,
          elevation: variant === "outline" || variant === "ghost" ? 0 : 4,
        },
        fullWidth && { width: "100%" },
        style,
      ]}
      className={`flex-row items-center justify-center rounded-2xl ${sizeClasses[size]} active:opacity-90`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={{ color: textColor }}
            className={`font-semibold ${textSizes[size]} ${icon ? "ml-2" : ""}`}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function getBgColor(
  variant: ButtonVariant,
  disabled: boolean,
  theme: (typeof THEMES)["light"]
): string {
  if (disabled) return theme.border;
  switch (variant) {
    case "primary":
      return theme.primary;
    case "secondary":
      return theme.secondary;
    case "outline":
    case "ghost":
      return "transparent";
    case "danger":
      return COLORS.error;
    default:
      return theme.primary;
  }
}

function getTextColor(
  variant: ButtonVariant,
  theme: (typeof THEMES)["light"]
): string {
  switch (variant) {
    case "primary":
    case "danger":
      return COLORS.white;
    case "secondary":
      return COLORS.white;
    case "outline":
    case "ghost":
      return theme.primary;
    default:
      return COLORS.white;
  }
}
