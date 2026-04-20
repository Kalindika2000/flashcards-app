"use client";

import { useCallback, useMemo, useState } from "react";
import type { Flashcard } from "@/features/study/types/flashcard";

type RestartMode = "all" | "difficult";
type FeedbackState = null | "known" | "unknown";

type UseFlashcardSessionParams = {
  onPersistMark?: (flashcardId: string, isKnown: boolean) => Promise<void>;
  onRestartStart?: () => void;
  onRestartEnd?: () => void;
};

export function useFlashcardSession({
  onPersistMark,
  onRestartStart,
  onRestartEnd,
}: UseFlashcardSessionParams = {}) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [sessionCards, setSessionCards] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFeedback, setShowFeedback] = useState<FeedbackState>(null);
  const [isFading, setIsFading] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [restartMode, setRestartMode] = useState<RestartMode>("all");
  const [mascotMood, setMascotMood] = useState("idle");
  const [mistakeCount, setMistakeCount] = useState(0);

  const activeCards = useMemo(
    () => (sessionCards.length > 0 ? sessionCards : flashcards.map((_, i) => i)),
    [sessionCards, flashcards],
  );
  const actualIndex = activeCards[currentIndex] ?? currentIndex;
  const currentCard = flashcards[actualIndex];
  const knownCount = flashcards.filter((c) => c.known).length;
  const someKnown = knownCount > 0;
  const allMastered = knownCount === flashcards.length;

  const resetMode = useCallback(() => {
    setSessionCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setIsSessionComplete(false);
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex >= activeCards.length - 1) {
      setIsSessionComplete(true);
      return;
    }

    setFlipped(false);

    if (flashcards[actualIndex]?.known) {
      setStreak(0);
    }

    setCurrentIndex((prev) => prev + 1);
  }, [activeCards.length, actualIndex, currentIndex, flashcards]);

  const goPrev = useCallback(() => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const restart = useCallback(async () => {
    onRestartStart?.();
    const freshCards = flashcards;
    setFlashcards(freshCards);

    let newCards: number[];
    if (restartMode === "all") {
      const sorted = freshCards
        .map((card, i) => {
          const timesSeen = card.timesSeen || 0;
          const timesCorrect = card.timesCorrect || 0;
          if (timesSeen === 0) return { index: i, priority: 2 };

          const accuracy = timesCorrect / timesSeen;
          if (accuracy < 0.7) return { index: i, priority: 1 };
          return { index: i, priority: 0 };
        })
        .sort((a, b) => b.priority - a.priority);

      newCards = sorted.map((item) => item.index);
    } else {
      const filtered = freshCards
        .map((card, i) => {
          const timesSeen = card.timesSeen || 0;
          const timesCorrect = card.timesCorrect || 0;
          if (timesSeen === 0) return i;

          const accuracy = timesCorrect / timesSeen;
          return accuracy < 0.7 ? i : -1;
        })
        .filter((i) => i !== -1);

      const sorted = filtered
        .map((i) => {
          const card = freshCards[i];
          const timesSeen = card.timesSeen || 0;
          const timesCorrect = card.timesCorrect || 0;
          const accuracy = timesSeen === 0 ? 0 : timesCorrect / timesSeen;
          const difficulty = 1 - accuracy;
          return { index: i, difficulty };
        })
        .sort((a, b) => b.difficulty - a.difficulty);

      newCards = sorted.map((item) => item.index);
    }

    setSessionCards(newCards);
    setCurrentIndex(0);
    setFlipped(false);
    setStreak(0);
    setIsSessionComplete(false);
    onRestartEnd?.();
  }, [flashcards, onRestartEnd, onRestartStart, restartMode]);

  const handleMarkCard = useCallback(
    async (isCorrect: boolean) => {
      const card = flashcards[actualIndex];
      const newKnownState = isCorrect;

      if (card?.id && onPersistMark) {
        await onPersistMark(card.id, newKnownState);
      }

      if (newKnownState) {
        setStreak((prev) => {
          const newStreak = prev + 1;
          setBestStreak((best) => (newStreak > best ? newStreak : best));
          if (newStreak % 5 === 0) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 1200);
          }
          return newStreak;
        });

        setShowFeedback("known");
        setMascotMood("happy");
        setIsFading(false);
        setTimeout(() => setIsFading(true), 1000);
        setTimeout(() => setShowFeedback(null), 1600);
        setMistakeCount(0);
      } else {
        setStreak(0);
        setShowFeedback("unknown");
        setMascotMood("sad");
        setIsFading(false);
        setTimeout(() => setIsFading(true), 900);
        setTimeout(() => setShowFeedback(null), 1500);
        setMistakeCount((prev) => prev + 1);
      }

      setTimeout(() => setMascotMood("idle"), 1800);
      setTimeout(() => {
        setFlashcards((prev) =>
          prev.map((c, idx) =>
            idx === actualIndex
              ? {
                  ...c,
                  known: newKnownState,
                  timesSeen: (c.timesSeen || 0) + 1,
                  timesCorrect: newKnownState
                    ? (c.timesCorrect || 0) + 1
                    : (c.timesCorrect || 0),
                }
              : c,
          ),
        );
        goNext();
      }, 300);
    },
    [actualIndex, flashcards, goNext, onPersistMark],
  );

  return {
    flashcards,
    setFlashcards,
    sessionCards,
    setSessionCards,
    currentIndex,
    setCurrentIndex,
    flipped,
    setFlipped,
    streak,
    bestStreak,
    showConfetti,
    showFeedback,
    isFading,
    isSessionComplete,
    setIsSessionComplete,
    restartMode,
    setRestartMode,
    mascotMood,
    mistakeCount,
    activeCards,
    currentCard,
    someKnown,
    allMastered,
    resetMode,
    goNext,
    goPrev,
    restart,
    handleMarkCard,
  };
}
