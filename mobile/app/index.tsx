// ============================================
// UniSage Mobile — Root Index (Router Redirect)
// ============================================
// Redirects to the correct stack based on auth state.

import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/hooks/useAuth";
import { COLORS } from "@/lib/constants";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.gray[50],
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: 180,
            backgroundColor: COLORS.brand[100],
            opacity: 0.7,
          }}
        />
        <ActivityIndicator size="large" color={COLORS.brand[600]} />
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/splash" />;
}
