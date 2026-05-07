// ============================================
// UniSage Mobile — SubjectCard Component
// ============================================

import { View, Text, Pressable, useColorScheme } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { COLORS, THEMES } from "@/lib/constants";
import { percentage, formatRelativeTime } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Subject } from "@/lib/types";

interface SubjectCardProps {
  subject: Subject;
  compact?: boolean;
}

export function SubjectCard({ subject, compact = false }: SubjectCardProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? THEMES.dark : THEMES.light;

  const progress = percentage(
    subject.completed_units ?? 0,
    subject.total_units
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/subject/${subject.id}`);
  };

  if (compact) {
    // Compact horizontal card for dashboard carousel
    return (
      <Pressable
        onPress={handlePress}
        className="rounded-[28px] p-4 active:opacity-80"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
          minHeight: 150,
          shadowColor: colorScheme === "dark" ? theme.primary : COLORS.black,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: colorScheme === "dark" ? 0.12 : 0.08,
          shadowRadius: 18,
          elevation: 4,
        }}
      >
        <View
          style={{
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(59,121,224,0.2)"
                : COLORS.brand[50],
          }}
          className="mb-3 h-10 w-10 items-center justify-center rounded-2xl"
        >
          <Text style={{ color: theme.primary }} className="text-xs font-bold">
            {subject.code.slice(0, 3).toUpperCase()}
          </Text>
        </View>
        <Text
          className="font-semibold text-sm"
          style={{ color: theme.text }}
          numberOfLines={2}
        >
          {subject.name}
        </Text>
        <Text className="text-xs mt-1" style={{ color: theme.textMuted }}>
          {subject.code}
        </Text>

        <View className="flex-1 justify-end mt-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs" style={{ color: theme.textMuted }}>
              Progress
            </Text>
            <Text
              className="text-xs font-semibold"
              style={{ color: theme.primary }}
            >
              {progress}%
            </Text>
          </View>
          <ProgressBar value={progress} height={6} />
        </View>
      </Pressable>
    );
  }

  // Full-width card for subjects list
  return (
    <Pressable
      onPress={handlePress}
      className="rounded-[28px] p-4 active:opacity-80"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        shadowColor: colorScheme === "dark" ? theme.primary : COLORS.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: colorScheme === "dark" ? 0.12 : 0.08,
        shadowRadius: 18,
        elevation: 4,
      }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-4">
          <Text
            className="font-semibold text-lg"
            style={{ color: theme.text }}
            numberOfLines={2}
          >
            {subject.name}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: theme.textMuted }}>
            {subject.code}
          </Text>
        </View>

        {/* Circular Progress Indicator */}
        <CircularProgress value={progress} size={54} />
      </View>

      {/* Badges */}
      <View className="flex-row gap-2 mb-3">
        <View
          style={{
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(59,121,224,0.2)"
                : COLORS.brand[50],
          }}
          className="px-2.5 py-1 rounded-full"
        >
          <Text
            style={{ color: theme.primary }}
            className="text-xs font-medium"
          >
            Year {subject.year}
          </Text>
        </View>
        <View
          style={{
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(59,121,224,0.2)"
                : COLORS.brand[50],
          }}
          className="px-2.5 py-1 rounded-full"
        >
          <Text
            style={{ color: theme.primary }}
            className="text-xs font-medium"
          >
            Sem {subject.semester}
          </Text>
        </View>
      </View>

      <Text className="text-sm" style={{ color: theme.textMuted }}>
        {subject.completed_units ?? 0}/{subject.total_units} units complete
      </Text>

      {subject.last_accessed && (
        <Text className="text-xs mt-1" style={{ color: theme.textMuted }}>
          Last studied: {formatRelativeTime(subject.last_accessed)}
        </Text>
      )}
    </Pressable>
  );
}

// ---- Circular Progress ----
function CircularProgress({
  value,
  size = 50,
}: {
  value: number;
  size?: number;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background circle */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: COLORS.gray[200],
        }}
      />
      {/* Progress overlay (simplified — uses a View border trick) */}
      <Text style={{ color: COLORS.brand[500] }} className="text-xs font-bold">
        {value}%
      </Text>
    </View>
  );
}
