// ============================================
// UniSage Mobile — Progress Tab Screen
// ============================================

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProgress } from '@/lib/hooks/useContent';
import { COLORS } from '@/lib/constants';
import { formatMinutes, percentage } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const { stats, isLoading, refresh } = useProgress();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (isLoading) return <LoadingSpinner />;

  const weeklyData = stats?.weekly_study_time ?? [];
  const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes), 1);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
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
        <View className="px-5 pt-4 pb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-4">
            Your Progress
          </Text>

          {/* Overall Stats */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <View className="w-[48%]">
              <StatCard
                label="Completed"
                value={`${stats?.total_completed ?? 0}/${stats?.total_content ?? 0}`}
                icon="checkmark-circle"
                color={COLORS.success}
                large
              />
            </View>
            <View className="w-[48%]">
              <StatCard
                label="Quiz Average"
                value={`${stats?.quiz_average ?? 0}%`}
                icon="trophy"
                color={COLORS.warning}
                large
              />
            </View>
            <View className="w-[48%]">
              <StatCard
                label="Study Time"
                value={formatMinutes(stats?.total_study_time ?? 0)}
                icon="time"
                color={COLORS.brand[500]}
                large
              />
            </View>
            <View className="w-[48%]">
              <StatCard
                label="Streak"
                value={`${stats?.current_streak ?? 0} days`}
                icon="flame"
                color={COLORS.error}
                large
              />
            </View>
          </View>

          {/* Weekly Study Time Chart */}
          {weeklyData.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
              <Text className="text-base font-semibold text-gray-900 mb-4">
                Study Time (Last 7 Days)
              </Text>
              <View className="flex-row justify-between items-end" style={{ height: 120 }}>
                {weeklyData.map((day, idx) => {
                  const barHeight = Math.max((day.minutes / maxMinutes) * 100, 4);
                  const dayLabel = new Date(day.date).toLocaleDateString('en', {
                    weekday: 'short',
                  });
                  return (
                    <View key={idx} className="items-center flex-1">
                      <Text className="text-xs text-gray-500 mb-1">
                        {day.minutes > 0 ? `${day.minutes}m` : ''}
                      </Text>
                      <View
                        style={{
                          height: barHeight,
                          backgroundColor: COLORS.brand[500],
                          width: 24,
                          borderRadius: 6,
                        }}
                      />
                      <Text className="text-xs text-gray-400 mt-1">{dayLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Subject Breakdown */}
          <Text className="text-base font-semibold text-gray-900 mb-3">
            By Subject
          </Text>
          {(stats?.subjects ?? []).length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Ionicons name="bar-chart-outline" size={40} color={COLORS.gray[300]} />
              <Text className="text-gray-400 mt-3 text-center">
                Start studying to see your progress here!
              </Text>
            </View>
          ) : (
            (stats?.subjects ?? []).map((sp) => (
              <View key={sp.subject_id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-1 mr-4">
                    <Text className="font-semibold text-gray-900" numberOfLines={1}>
                      {sp.subject_name}
                    </Text>
                    <Text className="text-xs text-gray-500">{sp.subject_code}</Text>
                  </View>
                  <Text
                    style={{ color: COLORS.brand[500] }}
                    className="font-bold text-base"
                  >
                    {sp.progress}%
                  </Text>
                </View>
                <ProgressBar value={sp.progress} />
                <View className="flex-row mt-2 gap-4">
                  <Text className="text-xs text-gray-500">
                    {sp.completed}/{sp.total} done
                  </Text>
                  {sp.quiz_avg != null && (
                    <Text className="text-xs text-gray-500">
                      Quiz avg: {sp.quiz_avg}%
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
