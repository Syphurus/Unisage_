// ============================================
// UniSage Mobile — Input Component
// ============================================

import {
  View,
  Text,
  TextInput,
  useColorScheme,
  type TextInputProps,
} from "react-native";
import { forwardRef } from "react";
import { COLORS, THEMES } from "@/lib/constants";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, ...props }, ref) => {
    const colorScheme = useColorScheme();
    const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;

    return (
      <View className="mb-4">
        {label && (
          <Text
            className="text-sm font-medium mb-1.5"
            style={{ color: theme.text }}
          >
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textMuted}
          style={{
            borderColor: error ? COLORS.error : theme.border,
            backgroundColor: theme.surface,
            color: theme.text,
            shadowColor: colorScheme === "dark" ? theme.primary : COLORS.black,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: colorScheme === "dark" ? 0.12 : 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
          className="border rounded-2xl px-4 py-3.5 text-base"
          {...props}
        />
        {error && (
          <Text className="text-xs mt-1" style={{ color: COLORS.error }}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
