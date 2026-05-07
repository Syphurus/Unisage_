"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bookmark, Pencil, Smile, Meh, Frown, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import type { Content } from "@/lib/types";

interface FlashcardViewerProps {
  flashcards: Content[];
  subjectId?: string;
}

export function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [cards, setCards] = useState(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [reviewCards, setReviewCards] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (flashcards.length > 0) {
      setCards(flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setKnownCards(new Set());
      setReviewCards(new Set());
      setIsComplete(false);
    }
  }, [flashcards.length]);

  const current = cards[currentIndex];
  const cardData = current?.data as { front: string; back: string };
  const progress = ((currentIndex + 1) / Math.max(cards.length, 1)) * 100;

  const flip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const advance = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex >= cards.length - 1) {
      setIsComplete(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#0D1B2A", "#00B4A6", "#22C55E", "#F59E0B"],
      });
    } else {
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 120);
    }
  }, [currentIndex, cards.length]);

  const markEasy = () => {
    if (!current) return;
    setKnownCards((prev) => new Set(prev).add(current.id));
    advance();
  };

  const markMedium = () => {
    if (!current) return;
    setReviewCards((prev) => new Set(prev).add(current.id));
    advance();
  };

  const markHard = () => {
    if (!current) return;
    setReviewCards((prev) => new Set(prev).add(current.id));
    advance();
  };

  const restart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setReviewCards(new Set());
    setIsComplete(false);
  };

  if (isComplete) {
    return (
      <div className="max-w-4xl mx-auto min-h-[520px] flex flex-col items-center justify-center text-center p-6">
        <Trophy className="h-14 w-14 text-[#F59E0B] mb-3" />
        <h2 className="text-[32px] font-bold text-[#0D1B2A]">
          Session Complete
        </h2>
        <p className="text-[13px] text-[#707891] mt-1">
          You reviewed {cards.length} flashcards.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-lg">
          <div className="unisage-card p-3">
            <p className="text-[10px] uppercase font-bold text-[#707891]">
              Easy
            </p>
            <p className="text-[20px] font-bold text-[#22C55E]">
              {knownCards.size}
            </p>
          </div>
          <div className="unisage-card p-3">
            <p className="text-[10px] uppercase font-bold text-[#707891]">
              Review
            </p>
            <p className="text-[20px] font-bold text-[#F59E0B]">
              {reviewCards.size}
            </p>
          </div>
          <div className="unisage-card p-3">
            <p className="text-[10px] uppercase font-bold text-[#707891]">
              Mastery
            </p>
            <p className="text-[20px] font-bold text-[#0D1B2A]">
              {Math.round((knownCards.size / Math.max(cards.length, 1)) * 100)}%
            </p>
          </div>
        </div>
        <Button className="mt-6" onClick={restart}>
          Study Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <div>
        <p className="text-[12px] text-[#707891] font-medium">
          ← Back to Quizzes
        </p>
        <h1 className="text-[32px] font-bold text-[#0D1B2A] leading-tight mt-1">
          Computer Networks
        </h1>
        <p className="text-[13px] text-[#707891]">
          Unit 4: The Transport Layer • Session active
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] text-[#707891] mb-2 font-bold uppercase tracking-[0.08em]">
          <span>Progress</span>
          <span>
            CARD {currentIndex + 1} OF {cards.length}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <div
        className="w-full perspective-1000 cursor-pointer"
        onClick={flip}
        role="button"
        tabIndex={0}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.45 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full h-[360px]"
        >
          <div
            className="absolute inset-0 rounded-2xl bg-white border border-[#EBEBF5] shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 flex flex-col backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="inline-flex w-fit rounded-full bg-[#FFF3E2] text-[#8B5E00] text-[10px] font-bold uppercase px-2 py-1">
              Question
            </div>
            <p className="text-[34px] text-[#EEF0F7] font-bold absolute right-5 bottom-4">
              #012
            </p>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[36px] text-center font-bold text-[#0D1B2A] leading-tight max-w-4xl">
                {cardData?.front}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button className="h-10 w-10 rounded-full border border-[#EBEBF5] inline-flex items-center justify-center">
                <Bookmark className="h-4 w-4 text-[#707891]" />
              </button>
              <Button className="px-6">Flip Card</Button>
            </div>
          </div>

          <div
            className="absolute inset-0 rounded-2xl bg-[#0D1B2A] text-white border border-[#EBEBF5] shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 flex flex-col backface-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="inline-flex w-fit rounded-full bg-white/10 text-white text-[10px] font-bold uppercase px-2 py-1">
              Answer
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[30px] text-center font-semibold leading-tight max-w-4xl">
                {cardData?.back}
              </p>
            </div>
            <div className="text-center text-[12px] text-white/70">
              Tap card to flip back
            </div>
          </div>
        </motion.div>
      </div>

      <div className="text-center">
        <p className="text-[10px] uppercase font-bold tracking-[0.08em] text-[#707891] mb-3">
          How difficult was this for you?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={markEasy}
            className="rounded-xl border border-[#EBEBF5] bg-white p-3 text-left hover:bg-[#F9F9FF]"
          >
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0D1B2A]">
              <Smile className="h-4 w-4 text-[#22C55E]" /> Easy
            </div>
            <p className="text-[11px] text-[#707891] mt-1">
              I knew this instantly
            </p>
          </button>
          <button
            onClick={markMedium}
            className="rounded-xl border border-[#EBEBF5] bg-white p-3 text-left hover:bg-[#F9F9FF]"
          >
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0D1B2A]">
              <Meh className="h-4 w-4 text-[#F59E0B]" /> Medium
            </div>
            <p className="text-[11px] text-[#707891] mt-1">
              Took a moment to recall
            </p>
          </button>
          <button
            onClick={markHard}
            className="rounded-xl border border-[#EBEBF5] bg-white p-3 text-left hover:bg-[#F9F9FF]"
          >
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0D1B2A]">
              <Frown className="h-4 w-4 text-[#EF4444]" /> Hard
            </div>
            <p className="text-[11px] text-[#707891] mt-1">
              Need to review this more
            </p>
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0D1B2A] text-white p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] uppercase text-white/60 font-bold">
            Active Time
          </p>
          <p className="text-[14px] font-semibold">12m 45s</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-white/60 font-bold">
            Mastery
          </p>
          <p className="text-[14px] font-semibold">
            {Math.max(65, knownCards.size * 10)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-white/60 font-bold">
            Streak
          </p>
          <p className="text-[14px] font-semibold">{knownCards.size} Cards</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-white/60 font-bold">
            Focus Mode
          </p>
          <p className="text-[14px] font-semibold">High</p>
        </div>
      </div>

      <button className="fixed right-8 bottom-8 h-12 w-12 rounded-full bg-[#00B4A6] text-white inline-flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.16)]">
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
