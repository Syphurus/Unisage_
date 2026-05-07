// ============================================
// UniSage Mobile — QuizViewer Component
// ============================================
// Full quiz flow: question → answer → review → results.

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useQuizAttempts } from '@/lib/hooks/useContent';
import type { QuizData, QuizQuestion } from '@/lib/types';

type QuizPhase = 'quiz' | 'review' | 'results';

interface QuizViewerProps {
  data: QuizData;
  contentId: string;
  onComplete: () => void;
}

export function QuizViewer({ data, contentId, onComplete }: QuizViewerProps) {
  const { submitAttempt } = useQuizAttempts();

  // Normalize questions: backend sends { question, options: [{text, isCorrect}], explanation }
  // Component expects { id, question, options: string[], correct_answer: number, explanation }
  const questions = (data.questions ?? []).map((q: any, idx: number) => {
    // Already normalized (options are strings)
    if (typeof q.options?.[0] === 'string') {
      return { ...q, id: q.id ?? String(idx) };
    }
    // Backend format: options are { text, isCorrect } objects
    const correctIdx = (q.options as any[]).findIndex((o: any) => o.isCorrect);
    return {
      id: q.id ?? String(idx),
      question: q.question,
      options: (q.options as any[]).map((o: any) => o.text),
      correct_answer: correctIdx >= 0 ? correctIdx : 0,
      explanation: q.explanation,
    };
  });
  const totalQuestions = questions.length;

  const [phase, setPhase] = useState<QuizPhase>('quiz');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [startTime] = useState(Date.now());
  const scrollRef = useRef<ScrollView>(null);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (phase !== 'quiz') return;
    const interval = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [phase, startTime]);

  const currentQ = questions[currentIdx];
  const isCorrect = hasSubmitted && selectedAnswer === currentQ?.correct_answer;
  const progress = ((currentIdx + (hasSubmitted ? 1 : 0)) / totalQuestions) * 100;

  const selectOption = (idx: number) => {
    if (hasSubmitted) return;
    Haptics.selectionAsync();
    setSelectedAnswer(idx);
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) {
      Alert.alert('Select an answer', 'Please choose an option before submitting.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHasSubmitted(true);

    // Store answer
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: selectedAnswer,
    }));
  };

  const nextQuestion = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setHasSubmitted(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Finish quiz
      finishQuiz();
    }
  };

  const finishQuiz = useCallback(async () => {
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const finalAnswers = { ...answers };
    if (selectedAnswer !== null && currentQ) {
      finalAnswers[currentQ.id] = selectedAnswer;
    }

    // Calculate score
    let score = 0;
    questions.forEach((q) => {
      if (finalAnswers[q.id] === q.correct_answer) score++;
    });

    // Submit to API
    await submitAttempt({
      contentId,
      score,
      totalQuestions,
      answers: finalAnswers,
      timeTaken,
    });

    setPhase('results');
  }, [answers, selectedAnswer, currentQ, questions, contentId, startTime, submitAttempt, totalQuestions]);

  // Format timer
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ---- Results Screen ----
  if (phase === 'results') {
    const finalAnswers = answers;
    let score = 0;
    questions.forEach((q) => {
      if (finalAnswers[q.id] === q.correct_answer) score++;
    });
    const pct = Math.round((score / totalQuestions) * 100);

    return (
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <View className="items-center mb-8">
          <Text className="text-6xl mb-4">
            {pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📚'}
          </Text>
          <Text className="text-3xl font-bold text-gray-900">
            {score}/{totalQuestions}
          </Text>
          <Text className="text-gray-500 mt-1">
            {pct}% correct
          </Text>
          <Text className="text-gray-400 text-sm mt-2">
            Time: {formatTime(elapsed)}
          </Text>
        </View>

        {/* Score bar */}
        <View className="mb-8">
          <ProgressBar
            value={pct}
            height={12}
            color={pct >= 80 ? COLORS.success : pct >= 50 ? COLORS.warning : COLORS.error}
          />
        </View>

        {/* Actions */}
        <View className="gap-3 mb-8">
          <Button title="Review Answers" onPress={() => setPhase('review')} fullWidth />
          <Button
            title="Mark as Complete"
            onPress={onComplete}
            variant="outline"
            fullWidth
          />
          <Button
            title="Retake Quiz"
            onPress={() => {
              setPhase('quiz');
              setCurrentIdx(0);
              setSelectedAnswer(null);
              setHasSubmitted(false);
              setAnswers({});
              setElapsed(0);
            }}
            variant="ghost"
            fullWidth
          />
        </View>
      </ScrollView>
    );
  }

  // ---- Review Screen ----
  if (phase === 'review') {
    return (
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="text-xl font-bold text-gray-900 mb-4">Review Answers</Text>

        {questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isRight = userAnswer === q.correct_answer;

          return (
            <View
              key={q.id}
              className="mb-4 p-4 rounded-2xl"
              style={{
                backgroundColor: isRight ? '#ECFDF5' : '#FEF2F2',
                borderWidth: 1,
                borderColor: isRight ? COLORS.success + '30' : COLORS.error + '30',
              }}
            >
              <View className="flex-row items-start mb-2">
                <Ionicons
                  name={isRight ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={isRight ? COLORS.success : COLORS.error}
                />
                <Text className="flex-1 ml-2 font-semibold text-gray-900">
                  {idx + 1}. {q.question}
                </Text>
              </View>

              {q.options.map((opt: any, optIdx: number) => {
                const isUserPick = optIdx === userAnswer;
                const isCorrectOption = optIdx === q.correct_answer;

                return (
                  <View key={optIdx} className="flex-row items-center ml-7 mb-1">
                    <Ionicons
                      name={
                        isCorrectOption
                          ? 'checkmark-circle'
                          : isUserPick
                            ? 'close-circle'
                            : 'ellipse-outline'
                      }
                      size={16}
                      color={
                        isCorrectOption
                          ? COLORS.success
                          : isUserPick
                            ? COLORS.error
                            : COLORS.gray[400]
                      }
                    />
                    <Text
                      className="ml-2 text-sm"
                      style={{
                        color: isCorrectOption
                          ? COLORS.success
                          : isUserPick
                            ? COLORS.error
                            : COLORS.gray[600],
                        fontWeight: isCorrectOption || isUserPick ? '600' : '400',
                      }}
                    >
                      {typeof opt === 'string' ? opt : opt.text}
                    </Text>
                  </View>
                );
              })}

              {q.explanation && (
                <Text className="ml-7 mt-2 text-sm text-gray-500 italic">
                  💡 {q.explanation}
                </Text>
              )}
            </View>
          );
        })}

        <Button title="Back to Results" onPress={() => setPhase('results')} variant="outline" fullWidth />
      </ScrollView>
    );
  }

  // ---- Quiz Phase ----
  if (!currentQ) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">No questions available</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Top bar */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm font-medium text-gray-500">
            Question {currentIdx + 1} of {totalQuestions}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color={COLORS.gray[500]} />
            <Text className="text-sm text-gray-500 ml-1">{formatTime(elapsed)}</Text>
          </View>
        </View>
        <ProgressBar value={progress} height={4} />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      >
        {/* Question */}
        <Text className="text-xl font-bold text-gray-900 mb-6 leading-7">
          {currentQ.question}
        </Text>

        {/* Options */}
        {currentQ.options.map((option: any, idx: number) => {
          const isSelected = selectedAnswer === idx;
          const isCorrectOpt = idx === currentQ.correct_answer;
          const showCorrect = hasSubmitted && isCorrectOpt;
          const showWrong = hasSubmitted && isSelected && !isCorrectOpt;

          let bgColor: string = COLORS.white;
          let borderColor: string = COLORS.gray[200];
          let textColor: string = COLORS.gray[900];

          if (!hasSubmitted && isSelected) {
            bgColor = COLORS.brand[50];
            borderColor = COLORS.brand[500];
            textColor = COLORS.brand[700];
          } else if (showCorrect) {
            bgColor = '#ECFDF5';
            borderColor = COLORS.success;
            textColor = COLORS.success;
          } else if (showWrong) {
            bgColor = '#FEF2F2';
            borderColor = COLORS.error;
            textColor = COLORS.error;
          }

          return (
            <Pressable
              key={idx}
              onPress={() => selectOption(idx)}
              disabled={hasSubmitted}
              style={{
                backgroundColor: bgColor,
                borderColor,
                borderWidth: 1.5,
                minHeight: 54,
              }}
              className="flex-row items-center px-4 py-3.5 rounded-xl mb-3 active:opacity-80"
            >
              {/* Option letter */}
              <View
                style={{
                  backgroundColor: isSelected && !hasSubmitted ? COLORS.brand[500] : COLORS.gray[100],
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                }}
                className="items-center justify-center mr-3"
              >
                {hasSubmitted && showCorrect ? (
                  <Ionicons name="checkmark" size={18} color={COLORS.success} />
                ) : hasSubmitted && showWrong ? (
                  <Ionicons name="close" size={18} color={COLORS.error} />
                ) : (
                  <Text
                    style={{
                      color: isSelected && !hasSubmitted ? COLORS.white : COLORS.gray[600],
                    }}
                    className="font-semibold text-sm"
                  >
                    {String.fromCharCode(65 + idx)}
                  </Text>
                )}
              </View>

              <Text
                style={{ color: textColor }}
                className="flex-1 text-base"
              >
                {typeof option === 'string' ? option : option.text}
              </Text>
            </Pressable>
          );
        })}

        {/* Explanation after submit */}
        {hasSubmitted && currentQ.explanation && (
          <View className="bg-blue-50 rounded-xl p-4 mt-2">
            <Text className="text-sm" style={{ color: COLORS.info }}>
              💡 {currentQ.explanation}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View className="px-5 py-4 pb-8 bg-white border-t border-gray-100">
        {!hasSubmitted ? (
          <Button
            title="Submit Answer"
            onPress={submitAnswer}
            disabled={selectedAnswer === null}
            fullWidth
            size="lg"
          />
        ) : (
          <Button
            title={currentIdx < totalQuestions - 1 ? 'Next Question →' : 'See Results'}
            onPress={nextQuestion}
            fullWidth
            size="lg"
          />
        )}
      </View>
    </View>
  );
}
