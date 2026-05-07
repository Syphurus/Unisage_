// ============================================
// UniSage Mobile — Login Screen
// ============================================

import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/hooks/useAuth";
import { COLORS } from "@/lib/constants";
import { Card } from "@/components/ui/Card";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login Failed", err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-8">
          {/* Header */}
          <View className="items-center mb-8">
            <View
              style={{ backgroundColor: COLORS.brand[50] }}
              className="w-16 h-16 rounded-[28px] items-center justify-center mb-4 shadow-soft"
            >
              <Text
                style={{ color: COLORS.brand[700] }}
                className="text-3xl font-bold"
              >
                U
              </Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900">
              Welcome back
            </Text>
            <Text className="text-gray-500 mt-2 text-base text-center">
              Sign in to continue studying
            </Text>
          </View>

          {/* Form */}
          <Card className="gap-4 p-5">
            {/* Email */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
              />
            </View>

            {/* Password */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Password
              </Text>
              <View className="relative">
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.gray[400]}
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 pr-16"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5"
                >
                  <Text className="text-brand-500 font-medium text-sm">
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={isSubmitting}
              style={{ backgroundColor: COLORS.brand[500] }}
              className="rounded-2xl py-4 items-center mt-4 active:opacity-80"
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Sign In
                </Text>
              )}
            </Pressable>
          </Card>

          {/* Footer */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500">Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text
                  style={{ color: COLORS.brand[500] }}
                  className="font-semibold"
                >
                  Sign Up
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
