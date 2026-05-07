// ============================================
// UniSage Mobile — Signup Screen
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

export default function SignupScreen() {
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [selectedYear, setSelectedYear] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const enrollmentRef = useRef<TextInput>(null);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    if (
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        enrollmentNumber: enrollment.trim() || undefined,
        year: selectedYear,
        collegeCode: "upes",
        branchCode: "cse",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Signup Failed", err.message || "Could not create account.");
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
        <View className="flex-1 px-6 pt-16 pb-8">
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
              Create Account
            </Text>
            <Text className="text-gray-500 mt-2 text-base text-center">
              Start studying smarter today
            </Text>
          </View>

          <Card className="gap-4 p-5">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Full Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={COLORS.gray[400]}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Email *
              </Text>
              <TextInput
                ref={emailRef}
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

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Password *
              </Text>
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 chars (A-z, 0-9)"
                placeholderTextColor={COLORS.gray[400]}
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={() => enrollmentRef.current?.focus()}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Enrollment Number
              </Text>
              <TextInput
                ref={enrollmentRef}
                value={enrollment}
                onChangeText={setEnrollment}
                placeholder="e.g. 500XXXXXXX"
                placeholderTextColor={COLORS.gray[400]}
                autoCapitalize="characters"
                returnKeyType="done"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Year of Study
              </Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4].map((yr) => (
                  <Pressable
                    key={yr}
                    onPress={() => {
                      setSelectedYear(yr);
                      Haptics.selectionAsync();
                    }}
                    style={{
                      backgroundColor:
                        selectedYear === yr
                          ? COLORS.brand[500]
                          : COLORS.gray[100],
                    }}
                    className="flex-1 py-3 rounded-xl items-center"
                  >
                    <Text
                      style={{
                        color:
                          selectedYear === yr ? COLORS.white : COLORS.gray[700],
                      }}
                      className="font-semibold"
                    >
                      Year {yr}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleSignup}
              disabled={isSubmitting}
              style={{ backgroundColor: COLORS.brand[500] }}
              className="rounded-2xl py-4 items-center mt-4 active:opacity-80"
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Create Account
                </Text>
              )}
            </Pressable>
          </Card>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text
                  style={{ color: COLORS.brand[500] }}
                  className="font-semibold"
                >
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
