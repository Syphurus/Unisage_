// ============================================
// UniSage Mobile — Dashboard / Home Screen
// ============================================

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useProgress } from "@/lib/hooks/useContent";
import { COLORS } from "@/lib/constants";
import { formatMinutes } from "@/lib/utils";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { TodaysFocus } from "@/components/dashboard/TodaysFocus";
import { SubjectCard } from "@/components/dashboard/SubjectCard";
import { StatCard } from "@/components/ui/StatCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";

export default function DashboardScreen() {
  const { user } = useAuth();
  const {
    subjects,
    isLoading: subjectsLoading,
    refresh: refreshSubjects,
  } = useSubjects();
  const {
    stats,
    isLoading: statsLoading,
    refresh: refreshStats,
  } = useProgress();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshSubjects(), refreshStats()]);
    setRefreshing(false);
  }, [refreshSubjects, refreshStats]);

  const isLoading = subjectsLoading && statsLoading;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ScreenWrapper edges={["top"]} bg={COLORS.gray[50]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand[500]}
          />
        }
      >
        <View className="px-5 pb-28 pt-2">
          <View className="mb-4 rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-soft">
            <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
              Study mode
            </Text>
            <Text className="mt-2 text-2xl font-bold text-gray-900">
              Deep work. Better grades.
            </Text>
            <Text className="mt-1 text-sm text-gray-500">
              One tap to continue, one glance to stay accountable.
            </Text>
          </View>

          {/* Welcome & Streak */}
          <WelcomeHeader name={user?.name ?? "Student"} />
          <StreakCard streak={stats?.current_streak ?? 0} />

          {/* Today's Focus */}
          <TodaysFocus subjects={subjects} />

          {/* Your Subjects */}
          <View className="mt-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900">
                Your Subjects
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/subjects")}>
                <Text
                  style={{ color: COLORS.brand[500] }}
                  className="text-sm font-semibold"
                >
                  See All
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
            >
              {subjects.slice(0, 6).map((subject) => (
                <View
                  key={subject.id}
                  className="px-1.5"
                  style={{ width: 200 }}
                >
                  <SubjectCard subject={subject} compact />
                </View>
              ))}
              {subjects.length === 0 && (
                <View className="px-4 py-8">
                  <Text className="text-gray-400 text-center">
                    No subjects found. Check back when courses are added!
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Quick Stats */}
          <View className="mt-6">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Quick Stats
            </Text>
            <View className="flex-row gap-3">
              <StatCard
                label="Quiz Avg"
                value={`${stats?.quiz_average ?? 0}%`}
                icon="trophy"
                color={COLORS.warning}
              />
              <StatCard
                label="Study Time"
                value={formatMinutes(stats?.total_study_time ?? 0)}
                icon="time"
                color={COLORS.brand[500]}
              />
              <StatCard
                label="Completed"
                value={`${stats?.total_completed ?? 0}`}
                icon="checkmark-circle"
                color={COLORS.success}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
