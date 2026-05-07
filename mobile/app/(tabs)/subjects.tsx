// ============================================
// UniSage Mobile — Subjects Tab Screen
// ============================================

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { COLORS, YEAR_OPTIONS } from '@/lib/constants';
import { SubjectCard } from '@/components/dashboard/SubjectCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Subject } from '@/lib/types';

export default function SubjectsScreen() {
  const [selectedYear, setSelectedYear] = useState(0);
  const [search, setSearch] = useState('');
  const { subjects, isLoading, refresh } = useSubjects(selectedYear || undefined);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Filter by search
  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()),
  );

  const renderSubject = useCallback(
    ({ item }: { item: Subject }) => (
      <View className="px-5 mb-3">
        <SubjectCard subject={item} />
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">Subjects</Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search subjects..."
            placeholderTextColor={COLORS.gray[400]}
            className="flex-1 ml-2 text-base text-gray-900"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Year Filter Chips */}
      <View className="px-5 mb-3">
        <ScrollableChips
          options={YEAR_OPTIONS}
          selected={selectedYear}
          onSelect={setSelectedYear}
        />
      </View>

      {/* Subjects List */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderSubject}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.brand[500]}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Ionicons name="book-outline" size={48} color={COLORS.gray[300]} />
              <Text className="text-gray-400 mt-4 text-base">
                {search ? 'No subjects match your search' : 'No subjects available'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---- Scrollable Filter Chips ----
import { ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

function ScrollableChips({
  options,
  selected,
  onSelect,
}: {
  options: readonly { label: string; value: number }[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                onSelect(opt.value);
                Haptics.selectionAsync();
              }}
              style={{
                backgroundColor: active ? COLORS.brand[500] : COLORS.white,
                borderColor: active ? COLORS.brand[500] : COLORS.gray[200],
              }}
              className="px-4 py-2 rounded-full border"
            >
              <Text
                style={{ color: active ? COLORS.white : COLORS.gray[700] }}
                className="text-sm font-medium"
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
