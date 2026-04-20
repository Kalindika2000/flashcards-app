"use client";

import { useCallback, useState } from "react";
import type { ChallengeAnswerResult } from "@/features/study/types/challengeQuestion";

/** Time to show correct/incorrect styling before advancing (Challenge mode). */
const ADVANCE_MS = 900;

export function useStudyChallengeSession(questionCount: number) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const resetChallengeSession = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswerRevealed(false);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setMaxStreak(0);
    setIsComplete(false);
  }, []);

  const revealAnswer = useCallback(() => {
    setAnswerRevealed(true);
  }, []);

  const handleAnswer = useCallback(
    (result: ChallengeAnswerResult) => {
      // Reveal mode only exposes Correct/Incorrect after reveal; multiple choice
      // submits directly. No extra guard — callers only fire when appropriate.

      if (result === "correct") {
        setCorrectCount((c) => c + 1);
        setStreak((prev) => {
          const next = prev + 1;
          setMaxStreak((m) => Math.max(m, next));
          setScore((s) => s + 10 + Math.min(prev, 10) * 2);
          return next;
        });
      } else {
        setStreak(0);
      }

      window.setTimeout(() => {
        setAnswerRevealed(false);
        setCurrentQuestionIndex((i) => {
          if (i >= questionCount - 1) {
            setIsComplete(true);
            return i;
          }
          return i + 1;
        });
      }, ADVANCE_MS);
    },
    [questionCount],
  );

  return {
    currentQuestionIndex,
    answerRevealed,
    score,
    correctCount,
    streak,
    maxStreak,
    isComplete,
    resetChallengeSession,
    revealAnswer,
    handleAnswer,
  };
}
