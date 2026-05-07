// ============================================
// UniSage Mobile — Subject Detail Screen
// ============================================

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSubject, useSubjectUnits, useUnitContent } from '@/lib/hooks/useSubjects';
import { COLORS } from '@/lib/constants';
import { percentage, formatMinutes } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Unit, ContentItem } from '@/lib/types';

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subject, isLoading: subjectLoading } = useSubject(id);
  const { units, isLoading: unitsLoading, refresh } = useSubjectUnits(id);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const toggleUnit = (unitId: string) => {
    Haptics.selectionAsync();
    setExpandedUnit((prev) => (prev === unitId ? null : unitId));
  };

  const openContent = (contentItem: ContentItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/content/${contentItem.id}`);
  };

  const isLoading = subjectLoading || unitsLoading;

  if (isLoading) return <LoadingSpinner />;
  if (!subject) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400 text-lg">Subject not found</Text>
      </SafeAreaView>
    );
  }

  const overallProgress = percentage(subject.completed_units ?? 0, subject.total_units);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Back',
          headerTintColor: COLORS.brand[500],
          headerStyle: { backgroundColor: COLORS.gray[50] },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        className="flex-1 bg-gray-50"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand[500]}
          />
        }
      >
        <View className="px-5 pb-8">
          {/* Subject Header */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <Text className="text-2xl font-bold text-gray-900">{subject.name}</Text>
            <Text className="text-gray-500 mt-1">{subject.code}</Text>

            <View className="flex-row gap-2 mt-3">
              <Badge label={`Year ${subject.year}`} />
              <Badge label={`Semester ${subject.semester}`} />
            </View>

            {/* Overall Progress */}
            <View className="mt-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-sm text-gray-500">Overall Progress</Text>
                <Text className="text-sm font-semibold" style={{ color: COLORS.brand[500] }}>
                  {overallProgress}%
                </Text>
              </View>
              <ProgressBar value={overallProgress} />
            </View>

            {/* Stats Row */}
            <View className="flex-row mt-4 gap-4">
              <MiniStat
                label="Units"
                value={`${subject.completed_units ?? 0}/${subject.total_units}`}
              />
            </View>
          </View>

          {/* Units List */}
          <Text className="text-lg font-bold text-gray-900 mb-3">Units</Text>

          {units.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Ionicons name="folder-open-outline" size={40} color={COLORS.gray[300]} />
              <Text className="text-gray-400 mt-3">No units available yet</Text>
            </View>
          ) : (
            units.map((unit) => (
              <UnitAccordion
                key={unit.id}
                unit={unit}
                isExpanded={expandedUnit === unit.id}
                onToggle={() => toggleUnit(unit.id)}
                onContentPress={openContent}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

// ---- Unit Accordion ----
function UnitAccordion({
  unit,
  isExpanded,
  onToggle,
  onContentPress,
}: {
  unit: Unit;
  isExpanded: boolean;
  onToggle: () => void;
  onContentPress: (c: any) => void;
}) {
  // Fetch content only when expanded
  const { contents, isLoading } = useUnitContent(isExpanded ? unit.id : undefined);

  return (
    <View className="bg-white rounded-2xl mb-3 shadow-sm overflow-hidden">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center p-4 active:bg-gray-50"
      >
        {/* Unit number badge */}
        <View
          style={{
            backgroundColor: unit.is_completed ? COLORS.success : COLORS.brand[100],
          }}
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
        >
          {unit.is_completed ? (
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
          ) : (
            <Text
              style={{ color: COLORS.brand[600] }}
              className="font-bold text-sm"
            >
              {unit.unit_number ?? unit.unitNumber}
            </Text>
          )}
        </View>

        <View className="flex-1">
          <Text className="font-semibold text-gray-900" numberOfLines={2}>
            {unit.title}
          </Text>
        </View>

        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.gray[400]}
        />
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && isLoading && (
        <View className="border-t border-gray-100 px-4 py-4 items-center">
          <ActivityIndicator size="small" color={COLORS.brand[500]} />
        </View>
      )}

      {isExpanded && !isLoading && contents.length > 0 && (
        <View className="border-t border-gray-100 px-4 pb-3 pt-2">
          {contents.map((content: any) => (
            <Pressable
              key={content.id}
              onPress={() => onContentPress(content)}
              className="flex-row items-center py-2.5 active:opacity-70"
            >
              <Ionicons
                name={getContentIcon(content.type)}
                size={18}
                color={COLORS.brand[500]}
              />
              <Text className="flex-1 ml-3 text-gray-700 text-sm" numberOfLines={1}>
                {content.title || content.type}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gray[300]} className="ml-2" />
            </Pressable>
          ))}
        </View>
      )}

      {isExpanded && !isLoading && contents.length === 0 && (
        <View className="border-t border-gray-100 px-4 py-4">
          <Text className="text-gray-400 text-sm text-center">
            No content available for this unit
          </Text>
        </View>
      )}
    </View>
  );
}

// ---- Helpers ----
function Badge({ label }: { label: string }) {
  return (
    <View
      style={{ backgroundColor: COLORS.brand[50] }}
      className="px-3 py-1 rounded-full"
    >
      <Text style={{ color: COLORS.brand[600] }} className="text-xs font-medium">
        {label}
      </Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs text-gray-400">{label}</Text>
      <Text className="font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

function getContentIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'long_notes':
      return 'document-text-outline';
    case 'short_notes':
      return 'reader-outline';
    case 'notes':
      return 'document-text-outline';
    case 'flashcard':
    case 'flashcards':
      return 'albums-outline';
    case 'quiz':
      return 'help-circle-outline';
    default:
      return 'document-outline';
  }
}
