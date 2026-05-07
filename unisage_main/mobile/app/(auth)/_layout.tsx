// ============================================
// UniSage Mobile — Auth Stack Layout
// ============================================

import { Stack } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.gray[50] },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
