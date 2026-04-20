"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  ChallengeAnswerResult,
  ChallengeQuestion,
} from "@/features/study/types/challengeQuestion";
import ChallengeSummary from "@/components/study/ChallengeSummary";
import { QuestionRenderer } from "@/components/study/QuestionRenderer";

function difficultyBreakdownFromQuestions(questions: ChallengeQuestion[]): {
  easy: number;
  medium: number;
  hard: number;
} {
  const d = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions) {
    const tier = q.difficulty ?? "medium";
    if (tier === "easy") d.easy += 1;
    else if (tier === "hard") d.hard += 1;
    else d.medium += 1;
  }
  return d;
}

/** Fade current card shortly before auto-advance (matches hook delay tail). */
const TRANSITION_OUT_DELAY_MS = 600;
type StudyChallengeSessionProps = {
  questions: ChallengeQuestion[];
  currentQuestionIndex: number;
  answerRevealed: boolean;
  score: number;
  correctCount: number;
  streak: number;
  isComplete: boolean;
  /** When true, session was built with weak-card focus (selection may still fall back if deck is uniformly strong). */
  focusWeakCards?: boolean;
  /** True when this run was started from “Review weak cards” (summary messaging). */
  isReviewSession?: boolean;
  weakFlashcardIds?: string[];
  onReviewWeakCards?: () => void | Promise<void>;
  onRevealAnswer: () => void;
  onAnswer: (result: ChallengeAnswerResult) => void;
  onRestartChallenge: () => void;
  onBackToModes: () => void;
};

export default function StudyChallengeSession({
  questions,
  currentQuestionIndex,
  answerRevealed,
  score,
  correctCount,
  streak,
  isComplete,
  focusWeakCards = false,
  isReviewSession = false,
  weakFlashcardIds = [],
  onReviewWeakCards,
  onRevealAnswer,
  onAnswer,
  onRestartChallenge,
  onBackToModes,
}: StudyChallengeSessionProps) {
  const total = questions.length;
  const current = questions[currentQuestionIndex];

  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsTransitioning(false);
    if (transitionOutTimerRef.current) {
      clearTimeout(transitionOutTimerRef.current);
      transitionOutTimerRef.current = null;
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    return () => {
      if (transitionOutTimerRef.current) {
        clearTimeout(transitionOutTimerRef.current);
      }
    };
  }, []);

  const handleAnswerWithTransition = useCallback(
    (result: ChallengeAnswerResult) => {
      onAnswer(result);
      if (transitionOutTimerRef.current) {
        clearTimeout(transitionOutTimerRef.current);
      }
      transitionOutTimerRef.current = setTimeout(() => {
        setIsTransitioning(true);
        transitionOutTimerRef.current = null;
      }, TRANSITION_OUT_DELAY_MS);
    },
    [onAnswer],
  );

  const missed = total - correctCount;
  const weakCardsCount = missed > 0 ? missed : undefined;

  return (
    <>
      {!isComplete && (
        <div
          style={{
            maxWidth: "440px",
            width: "calc(100% - 40px)",
            marginLeft: "auto",
            marginRight: "auto",
            marginTop: "12px",
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            fontWeight: 600,
            color: "#6b7280",
          }}
        >
          <span>
            {total > 0 ? `Question ${currentQuestionIndex + 1} / ${total}` : "\u00a0"}
          </span>
          <span style={{ color: "#111827" }}>
            Score {score} · Streak {streak} · Correct {correctCount}
          </span>
        </div>
      )}

      {!isComplete && current && (
        <>
          <motion.div
            key={current.flashcardId}
            style={{
              maxWidth: "440px",
              width: "calc(100% - 40px)",
              marginLeft: "auto",
              marginRight: "auto",
              marginTop: "8px",
              border: "2px solid #16a34a",
              borderRadius: "12px",
              padding: "20px",
              background: "#ffffff",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
            }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div
              className={[
                "transition-all duration-300",
                isTransitioning
                  ? "opacity-0 translate-y-2"
                  : "opacity-100 translate-y-0",
              ].join(" ")}
            >
              <QuestionRenderer
                question={current}
                revealed={answerRevealed}
                onReveal={onRevealAnswer}
                onAnswer={handleAnswerWithTransition}
              />
            </div>
          </motion.div>
          {focusWeakCards ? (
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              🎯 Focusing on cards you need to improve
            </p>
          ) : null}
        </>
      )}

      {isComplete && (
        <ChallengeSummary
          correctCount={correctCount}
          totalQuestions={total}
          difficultyBreakdown={difficultyBreakdownFromQuestions(questions)}
          weakCardsCount={weakCardsCount}
          weakFlashcardIds={weakFlashcardIds}
          isReviewSession={isReviewSession}
          onReviewWeakCards={onReviewWeakCards}
          onRestart={onRestartChallenge}
          onExit={onBackToModes}
        />
      )}
    </>
  );
}
