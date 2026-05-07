// ============================================
// UniSage Mobile — Root Layout
// ============================================
// Wraps the entire app with providers (Auth, SWR, Gesture Handler).
// expo-router uses this as the entry layout.

import "../global.css";
import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SWRConfig } from "swr";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { COLORS } from "@/lib/constants";

// Keep splash screen visible while we load fonts / auth
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide native splash after a brief delay (auth check happens inside AuthProvider)
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 220,
            height: 220,
            borderRadius: 220,
            backgroundColor: COLORS.brand[100],
            opacity: 0.6,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 20,
            left: -60,
            width: 160,
            height: 160,
            borderRadius: 160,
            backgroundColor: COLORS.cyan[100],
            opacity: 0.45,
          }}
        />
        <SWRConfig
          value={{
            provider: () => new Map(),
            revalidateOnFocus: false,
            shouldRetryOnError: true,
            errorRetryCount: 2,
          }}
        >
          <AuthProvider>
            <StatusBar style="dark" backgroundColor={COLORS.gray[50]} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.gray[50] },
                animation: "slide_from_right",
              }}
            />
          </AuthProvider>
        </SWRConfig>
      </View>
    </GestureHandlerRootView>
  );
}
