// ============================================
// UniSage Mobile — FlashcardViewer Component
// ============================================
// Tap-to-flip + swipe gestures + animated transitions.

import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/lib/constants';
import { shuffle } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { FlashcardData } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface FlashcardViewerProps {
  flashcards: FlashcardData[];
  onComplete: () => void;
}

export function FlashcardViewer({ flashcards, onComplete }: FlashcardViewerProps) {
  const [cards, setCards] = useState(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Animation values
  const rotateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const flipCard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFlipped = !isFlipped;
    rotateY.value = withTiming(newFlipped ? 180 : 0, { duration: 300 });
    setIsFlipped(newFlipped);
  }, [isFlipped, rotateY]);

  const goToNext = useCallback(
    (direction: 'right' | 'left') => {
      if (direction === 'right') {
        setKnownCount((c) => c + 1);
      } else {
        setReviewCount((c) => c + 1);
      }

      if (currentIndex >= cards.length - 1) {
        setIsComplete(true);
        return;
      }

      // Reset card state
      cardOpacity.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(setCurrentIndex)(currentIndex + 1);
        runOnJS(setIsFlipped)(false);
        rotateY.value = 0;
        translateX.value = 0;
        cardOpacity.value = withTiming(1, { duration: 150 });
      });
    },
    [currentIndex, cards.length, cardOpacity, rotateY, translateX],
  );

  const handleSwipe = useCallback(
    (direction: 'right' | 'left') => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Animate card off screen
      translateX.value = withTiming(
        direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH,
        { duration: 200 },
        () => {
          runOnJS(goToNext)(direction);
        },
      );
    },
    [translateX, goToNext],
  );

  // ---- Pan Gesture ----
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        runOnJS(handleSwipe)(e.translationX > 0 ? 'right' : 'left');
      } else {
        translateX.value = withSpring(0);
      }
    });

  // ---- Animated Styles ----
  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotateY: `${interpolate(rotateY.value, [0, 180], [0, 180])}deg` },
      { scale: interpolate(Math.abs(translateX.value), [0, SCREEN_WIDTH], [1, 0.9], Extrapolation.CLAMP) },
    ],
    opacity: cardOpacity.value,
    backfaceVisibility: 'hidden' as const,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotateY: `${interpolate(rotateY.value, [0, 180], [180, 360])}deg` },
      { scale: interpolate(Math.abs(translateX.value), [0, SCREEN_WIDTH], [1, 0.9], Extrapolation.CLAMP) },
    ],
    opacity: cardOpacity.value,
    backfaceVisibility: 'hidden' as const,
  }));

  // Swipe indicator colors
  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));
  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const shuffleCards = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCards(shuffle(flashcards));
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setReviewCount(0);
    setIsComplete(false);
    rotateY.value = 0;
    translateX.value = 0;
    cardOpacity.value = 1;
  };

  // ---- Completion Screen ----
  if (isComplete) {
    const total = cards.length;
    const scorePercent = Math.round((knownCount / total) * 100);

    return (
      <View className="flex-1 items-center justify-center p-6 bg-white">
        <View className="items-center mb-8">
          <Text className="text-6xl mb-4">🎉</Text>
          <Text className="text-2xl font-bold text-gray-900">All Done!</Text>
          <Text className="text-gray-500 mt-2 text-center">
            You've reviewed all {total} flashcards
          </Text>
        </View>

        <View className="flex-row gap-6 mb-8">
          <View className="items-center">
            <Text className="text-3xl font-bold" style={{ color: COLORS.success }}>
              {knownCount}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">Known</Text>
          </View>
          <View className="items-center">
            <Text className="text-3xl font-bold" style={{ color: COLORS.warning }}>
              {reviewCount}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">Review</Text>
          </View>
          <View className="items-center">
            <Text className="text-3xl font-bold" style={{ color: COLORS.brand[500] }}>
              {scorePercent}%
            </Text>
            <Text className="text-sm text-gray-500 mt-1">Score</Text>
          </View>
        </View>

        <View className="w-full gap-3">
          <Button title="Mark as Complete" onPress={onComplete} fullWidth />
          <Button title="Shuffle & Retry" onPress={shuffleCards} variant="outline" fullWidth />
        </View>
      </View>
    );
  }

  // ---- Main Card View ----
  const current = cards[currentIndex];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
        <Text className="text-gray-500 text-sm">
          Card {currentIndex + 1} of {cards.length}
        </Text>
        <Pressable onPress={shuffleCards} className="flex-row items-center">
          <Ionicons name="shuffle" size={18} color={COLORS.brand[500]} />
          <Text style={{ color: COLORS.brand[500] }} className="ml-1 text-sm font-medium">
            Shuffle
          </Text>
        </Pressable>
      </View>

      {/* Progress dots */}
      <View className="flex-row px-5 mb-4 gap-1">
        {cards.map((_, idx) => (
          <View
            key={idx}
            className="flex-1 h-1 rounded-full"
            style={{
              backgroundColor:
                idx < currentIndex
                  ? COLORS.brand[500]
                  : idx === currentIndex
                    ? COLORS.brand[300]
                    : COLORS.gray[200],
            }}
          />
        ))}
      </View>

      {/* Swipe indicators */}
      <View className="flex-row justify-between px-8 absolute top-1/2 left-0 right-0 z-10 pointer-events-none">
        <Animated.View style={leftIndicatorStyle} className="bg-orange-500 rounded-full p-3">
          <Ionicons name="close" size={24} color={COLORS.white} />
        </Animated.View>
        <Animated.View style={rightIndicatorStyle} className="bg-green-500 rounded-full p-3">
          <Ionicons name="checkmark" size={24} color={COLORS.white} />
        </Animated.View>
      </View>

      {/* Card */}
      <View className="flex-1 items-center justify-center px-5">
        <GestureDetector gesture={panGesture}>
          <View style={{ width: SCREEN_WIDTH - 40, height: 380 }}>
            <Pressable onPress={flipCard} style={{ flex: 1 }}>
              {/* Front */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: COLORS.white,
                    borderRadius: 20,
                    padding: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: COLORS.black,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 6,
                  },
                  frontStyle,
                ]}
              >
                <Text className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                  Question
                </Text>
                <Text className="text-xl text-gray-900 text-center font-medium leading-8">
                  {current?.front}
                </Text>
                <Text className="text-xs text-gray-400 mt-6">
                  Tap to reveal answer
                </Text>
              </Animated.View>

              {/* Back */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: COLORS.brand[50],
                    borderRadius: 20,
                    padding: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: COLORS.black,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 6,
                  },
                  backStyle,
                ]}
              >
                <Text className="text-xs uppercase tracking-wider mb-4" style={{ color: COLORS.brand[500] }}>
                  Answer
                </Text>
                <Text className="text-xl text-gray-900 text-center font-medium leading-8">
                  {current?.back}
                </Text>
              </Animated.View>
            </Pressable>
          </View>
        </GestureDetector>
      </View>

      {/* Action Buttons (visible after flip) */}
      {isFlipped && (
        <View className="flex-row gap-4 px-8 pb-8">
          <Pressable
            onPress={() => handleSwipe('left')}
            className="flex-1 py-4 rounded-xl items-center active:opacity-80"
            style={{ backgroundColor: COLORS.warning }}
          >
            <Text className="text-white font-semibold">Need review</Text>
          </Pressable>
          <Pressable
            onPress={() => handleSwipe('right')}
            className="flex-1 py-4 rounded-xl items-center active:opacity-80"
            style={{ backgroundColor: COLORS.success }}
          >
            <Text className="text-white font-semibold">I know this ✓</Text>
          </Pressable>
        </View>
      )}

      {/* Tap hint (before flip) */}
      {!isFlipped && (
        <View className="items-center pb-8">
          <Text className="text-gray-400 text-sm">
            ← Swipe left: Review · Swipe right: Know it →
          </Text>
        </View>
      )}
    </View>
  );
}
