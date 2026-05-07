// ============================================
// UniSage Mobile — Splash Screen
// ============================================
// Branded splash with logo & tagline.
// Auto-navigates to login after a brief animation delay.

import { useEffect } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "@/lib/hooks/useAuth";
import { COLORS } from "@/lib/constants";

export default function SplashScreen() {
  const { isAuthenticated, isLoading } = useAuth();

  // Animation values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate in
    logoScale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.back(1.5)),
    });
    logoOpacity.value = withTiming(1, { duration: 500 });
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    // Navigate after delay
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)/login");
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View
      style={{ backgroundColor: COLORS.gray[50] }}
      className="flex-1 items-center justify-center px-6"
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -60,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: 220,
          backgroundColor: COLORS.brand[100],
          opacity: 0.7,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -40,
          left: -40,
          width: 200,
          height: 200,
          borderRadius: 200,
          backgroundColor: COLORS.cyan[100],
          opacity: 0.55,
        }}
      />

      {/* Logo */}
      <Animated.View style={logoStyle} className="items-center">
        <View
          style={{ backgroundColor: COLORS.brand[500] }}
          className="w-24 h-24 rounded-[32px] items-center justify-center mb-4 shadow-glow"
        >
          <Text className="text-white text-5xl font-bold">U</Text>
        </View>
        <Text className="text-gray-900 text-4xl font-bold tracking-wider">
          UniSage
        </Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={taglineStyle} className="mt-4">
        <Text className="text-gray-500 text-lg text-center">
          Study smarter for UPES CSE
        </Text>
      </Animated.View>

      <View className="mt-8 rounded-full border border-white/80 bg-white/85 px-4 py-2 shadow-soft">
        <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
          Fast. Focused. Smooth.
        </Text>
      </View>

      {/* Bottom branding */}
      <View className="absolute bottom-12">
        <Text className="text-gray-400 text-sm">Made for UPES students</Text>
      </View>
    </View>
  );
}
