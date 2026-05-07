// ============================================
// UniSage Mobile — Content Viewer Screen
// ============================================
// Routes to the correct viewer based on content type:
// notes → NotesViewer, flashcards → FlashcardViewer, quiz → QuizViewer

import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useContent, useBookmarks, useProgress } from '@/lib/hooks/useContent';
import { COLORS } from '@/lib/constants';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotesViewer } from '@/components/content/NotesViewer';
import { FlashcardViewer } from '@/components/content/FlashcardViewer';
import { QuizViewer } from '@/components/content/QuizViewer';
import type { ContentItem, FlashcardData, QuizData, NotesData } from '@/lib/types';

export default function ContentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { content, isLoading } = useContent(id);
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
  const { markProgress } = useProgress();
  const [startTime] = useState(Date.now());

  // Find if this content is bookmarked
  const existingBookmark = bookmarks.find((b) => b.content_id === id);
  const isBookmarked = !!existingBookmark;

  const toggleBookmark = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isBookmarked && existingBookmark) {
      await removeBookmark(existingBookmark.id);
    } else if (id) {
      await addBookmark(id);
    }
  }, [isBookmarked, existingBookmark, id, addBookmark, removeBookmark]);

  /** Called when user finishes content (marks complete + tracks time) */
  const handleComplete = useCallback(async () => {
    if (!id) return;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    await markProgress(id, timeSpent);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Done!', 'Content marked as complete.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [id, startTime, markProgress]);

  if (isLoading) return <LoadingSpinner />;

  if (!content) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray[300]} />
        <Text className="text-gray-400 mt-4 text-lg">Content not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: COLORS.brand[500] }} className="font-semibold">
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: content.title,
          headerBackTitle: 'Back',
          headerTintColor: COLORS.brand[500],
          headerStyle: { backgroundColor: COLORS.white },
          headerRight: () => (
            <Pressable onPress={toggleBookmark} className="pr-2">
              <Ionicons
                name={isBookmarked ? 'heart' : 'heart-outline'}
                size={24}
                color={isBookmarked ? COLORS.error : COLORS.gray[500]}
              />
            </Pressable>
          ),
        }}
      />

      <View className="flex-1 bg-white">
        {(content.type === 'long_notes' || content.type === 'short_notes' || content.type === 'notes') && (
          <NotesViewer
            data={(content.data ?? content.content_data) as NotesData}
            onComplete={handleComplete}
          />
        )}
        {(content.type === 'flashcard' || content.type === 'flashcards') && (
          <FlashcardViewer
            flashcards={((content.data as any)?.items ?? content.content_data) as FlashcardData[]}
            onComplete={handleComplete}
          />
        )}
        {content.type === 'quiz' && (
          <QuizViewer
            data={((content.data as any) ?? content.content_data) as QuizData}
            contentId={content.id}
            onComplete={handleComplete}
          />
        )}
      </View>
    </>
  );
}
