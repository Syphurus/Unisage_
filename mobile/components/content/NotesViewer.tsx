// ============================================
// UniSage Mobile — NotesViewer Component
// ============================================
// Clean reading experience for notes content.
// Supports HTML, markdown text, and plain text.

import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import type { NotesData } from '@/lib/types';

interface NotesViewerProps {
  data: NotesData;
  onComplete: () => void;
}

export function NotesViewer({ data, onComplete }: NotesViewerProps) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);

  // Track scroll position for progress bar
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const totalScrollable = contentSize.height - layoutMeasurement.height;
    if (totalScrollable > 0) {
      setScrollProgress(Math.min((contentOffset.y / totalScrollable) * 100, 100));
    }
  }, []);

  // Get text content from data
  const textContent = data.text || data.markdown || data.html || '';

  // Simple HTML tag stripping for plain display
  const cleanText = textContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  // Split into paragraphs
  const paragraphs = cleanText.split(/\n\n+/).filter(Boolean);

  return (
    <View className="flex-1">
      {/* Sticky Progress Bar */}
      <View className="px-4 pt-2 pb-1 bg-white border-b border-gray-100">
        <ProgressBar value={scrollProgress} height={4} />
        <Text className="text-xs text-gray-400 text-right mt-1">
          {Math.round(scrollProgress)}% read
        </Text>
      </View>

      {/* Notes Content */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        onLayout={(e) => setViewHeight(e.nativeEvent.layout.height)}
      >
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => {
            // Detect headings (lines starting with # or all caps short lines)
            const isHeading =
              para.startsWith('#') ||
              (para.length < 80 && para === para.toUpperCase() && para.length > 3);
            const headingText = para.replace(/^#+\s*/, '');

            if (isHeading) {
              return (
                <Text
                  key={idx}
                  className="text-xl font-bold text-gray-900 mt-6 mb-3"
                >
                  {headingText}
                </Text>
              );
            }

            return (
              <Text
                key={idx}
                className="text-base text-gray-700 leading-7 mb-4"
                style={{ lineHeight: 28 }}
              >
                {para}
              </Text>
            );
          })
        ) : (
          <View className="items-center py-12">
            <Ionicons name="document-text-outline" size={48} color={COLORS.gray[300]} />
            <Text className="text-gray-400 mt-4">No content available</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 pb-8">
        <Button
          title="Mark as Complete ✓"
          onPress={onComplete}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}
