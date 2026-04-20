"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  ChallengeAnswerResult,
  ChallengeQuestion,
} from "@/features/study/types/challengeQuestion";
import ChallengeSummary from "@/components/study/ChallengeSummary";
import { QuestionRenderer } from "@/components/study/QuestionRenderer";

/** Fade current card shortly before auto-advance (matches hook delay tail). */
const TRANSITION_OUT_DELAY_MS = 600;
const RECOVERY_FEEDBACK_MS = 1200;

function buildHint(answer: string, level: 1 | 2): string {
  const trimmed = answer.trim();
  if (!trimmed) return "Try recalling the key idea first.";

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (level === 1) {
    if (words.length >= 1) {
      const first = words[0] ?? "";
      if (first.length <= 3) return `${first[0] ?? ""}…`;
      return `${first.slice(0, Math.min(3, first.length))}…`;
    }
    if (trimmed.length <= 4) return `${trimmed[0] ?? ""}…`;
    if (trimmed.length <= 10) return `${trimmed.slice(0, 2)}…`;
    return `${trimmed.slice(0, 4)}…`;
  }

  if (words.length >= 2) {
    const first = words[0] ?? "";
    const second = words[1] ?? "";
    return `${first.slice(0, Math.min(5, first.length))}… ${second.slice(0, Math.min(4, second.length))}…`;
  }
  if (words.length === 1) {
    const only = words[0] ?? "";
    return `${only.slice(0, Math.min(6, only.length))}…`;
  }
  if (trimmed.length <= 8) return `${trimmed.slice(0, Math.min(4, trimmed.length))}…`;
  return `${trimmed.slice(0, Math.min(8, trimmed.length))}…`;
}

type StudyChallengeSessionProps = {
  questions: ChallengeQuestion[];
  currentQuestionIndex: number;
  answerRevealed: boolean;
  score: number;
  correctCount: number;
  streak: number;
  isComplete: boolean;
  sessionType?: "challenge" | "review";
  answerResultsByFlashcardId?: Record<string, ChallengeAnswerResult>;
  previousPerformance?: {
    previousCorrect: number;
    previousTotal: number;
  } | null;
  /** When true, session was built with weak-card focus (selection may still fall back if deck is uniformly strong). */
  focusWeakCards?: boolean;
  reviewFlashcardIds?: string[];
  onReviewCards?: () => void | Promise<void>;
  onContinueChallenge?: () => void | Promise<void>;
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
  sessionType = "challenge",
  answerResultsByFlashcardId = {},
  previousPerformance,
  focusWeakCards = false,
  reviewFlashcardIds = [],
  onReviewCards,
  onContinueChallenge,
  onRevealAnswer,
  onAnswer,
  onRestartChallenge,
  onBackToModes,
}: StudyChallengeSessionProps) {
  const total = questions.length;
  const current = questions[currentQuestionIndex];
  const [cardAttemptCounts, setCardAttemptCounts] = useState<Record<string, number>>(
    {},
  );
  const [cardIncorrectCounts, setCardIncorrectCounts] = useState<
    Record<string, number>
  >({});
  const [hintRevealedByCard, setHintRevealedByCard] = useState<
    Record<string, boolean>
  >({});
  const [hintAnswerRevealedByCard, setHintAnswerRevealedByCard] = useState<
    Record<string, boolean>
  >({});
  const [showRecoveryForCardId, setShowRecoveryForCardId] = useState<string | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsTransitioning(false);
    if (transitionOutTimerRef.current) {
      clearTimeout(transitionOutTimerRef.current);
      transitionOutTimerRef.current = null;
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (isComplete) return;
    const id = current?.flashcardId?.trim();
    if (!id) return;
    setCardAttemptCounts((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));
  }, [current?.flashcardId, isComplete]);

  // Reset hint-related UI and per-card counters for each new session payload.
  useEffect(() => {
    setCardAttemptCounts({});
    setCardIncorrectCounts({});
    setHintRevealedByCard({});
    setHintAnswerRevealedByCard({});
  }, [questions]);

  useEffect(() => {
    return () => {
      if (transitionOutTimerRef.current) {
        clearTimeout(transitionOutTimerRef.current);
      }
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, []);

  const handleAnswerWithTransition = useCallback(
    (result: ChallengeAnswerResult) => {
      const id = current?.flashcardId?.trim();
      if (id && result === "incorrect") {
        setCardIncorrectCounts((prev) => ({
          ...prev,
          [id]: (prev[id] ?? 0) + 1,
        }));
      }
      if (id && result === "correct" && (cardIncorrectCounts[id] ?? 0) >= 2) {
        setShowRecoveryForCardId(id);
        if (recoveryTimerRef.current) {
          clearTimeout(recoveryTimerRef.current);
        }
        recoveryTimerRef.current = setTimeout(() => {
          setShowRecoveryForCardId(null);
          recoveryTimerRef.current = null;
        }, RECOVERY_FEEDBACK_MS);
      }
      onAnswer(result);
      if (transitionOutTimerRef.current) {
        clearTimeout(transitionOutTimerRef.current);
      }
      transitionOutTimerRef.current = setTimeout(() => {
        setIsTransitioning(true);
        transitionOutTimerRef.current = null;
      }, TRANSITION_OUT_DELAY_MS);
    },
    [cardIncorrectCounts, current?.flashcardId, onAnswer],
  );

  const totalIncorrect = reviewFlashcardIds.length;
  const currentFlashcardId = current?.flashcardId?.trim() ?? "";
  const currentAttemptCount =
    currentFlashcardId.length > 0 ? (cardAttemptCounts[currentFlashcardId] ?? 0) : 0;
  const currentResult =
    currentFlashcardId.length > 0
      ? answerResultsByFlashcardId[currentFlashcardId]
      : undefined;
  const currentIncorrectCount =
    currentFlashcardId.length > 0 ? (cardIncorrectCounts[currentFlashcardId] ?? 0) : 0;
  const hintLevel: 1 | 2 = currentIncorrectCount >= 3 ? 2 : 1;
  const canRevealFullAnswer = currentIncorrectCount >= 4;
  const hintAlreadyShown =
    currentFlashcardId.length > 0
      ? Boolean(hintRevealedByCard[currentFlashcardId])
      : false;
  const shouldShowHintPrompt =
    !isComplete &&
    sessionType === "review" &&
    currentResult === "incorrect" &&
    currentIncorrectCount >= 2 &&
    !hintAlreadyShown &&
    currentFlashcardId.length > 0;
  const shouldShowPartialHint =
    !isComplete &&
    sessionType === "review" &&
    currentResult === "incorrect" &&
    currentFlashcardId.length > 0 &&
    Boolean(hintRevealedByCard[currentFlashcardId]);
  const shouldShowHintAnswer =
    shouldShowPartialHint &&
    currentFlashcardId.length > 0 &&
    Boolean(hintAnswerRevealedByCard[currentFlashcardId]);
  const showRecoveryFeedback =
    !isComplete &&
    sessionType === "review" &&
    currentResult === "correct" &&
    currentFlashcardId.length > 0 &&
    showRecoveryForCardId === currentFlashcardId &&
    currentIncorrectCount >= 2;
  const currentAccuracy =
    total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const previousAccuracy =
    previousPerformance && previousPerformance.previousTotal > 0
      ? Math.round(
          (previousPerformance.previousCorrect / previousPerformance.previousTotal) *
            100,
        )
      : null;
  const accuracyDelta =
    previousAccuracy != null ? currentAccuracy - previousAccuracy : 0;
  const previousIncorrect =
    previousPerformance != null
      ? Math.max(0, previousPerformance.previousTotal - previousPerformance.previousCorrect)
      : 0;
  const masteredCount = Math.max(0, previousIncorrect - totalIncorrect);
  const reviewSummaryTitle =
    accuracyDelta > 0
      ? "Nice improvement 🚀"
      : accuracyDelta === 0
        ? "Almost there 👀"
        : "Keep going 💪";
  const reviewSummaryMainStat =
    accuracyDelta > 0
      ? `${previousAccuracy ?? 0}% → ${currentAccuracy}% (+${accuracyDelta}%)`
      : accuracyDelta === 0
        ? `${currentAccuracy}% correct again`
        : `${currentAccuracy}% correct this round`;
  const reviewSummaryMessage =
    accuracyDelta > 0
      ? "Big improvement — keep it going"
      : accuracyDelta === 0
        ? "One more pass should do it"
        : "This one’s tricky — another quick review will help lock it in";

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
          {shouldShowHintPrompt ? (
            <div className="mt-2 flex flex-col items-center gap-2">
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {currentIncorrectCount === 2
                  ? "This one&apos;s a bit tricky — want a hint?"
                  : "Need another clue?"}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!currentFlashcardId) return;
                  setHintRevealedByCard((prev) => ({
                    ...prev,
                    [currentFlashcardId]: true,
                  }));
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Show hint
              </button>
            </div>
          ) : null}
          {shouldShowPartialHint && current ? (
            <div className="mt-2 flex flex-col items-center gap-2">
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Here&apos;s a clue: {buildHint(current.answer, hintLevel)}
              </p>
              {!shouldShowHintAnswer && canRevealFullAnswer ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!currentFlashcardId) return;
                    setHintAnswerRevealedByCard((prev) => ({
                      ...prev,
                      [currentFlashcardId]: true,
                    }));
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Show answer
                </button>
              ) : shouldShowHintAnswer ? (
                <p className="text-center text-xs text-gray-600 dark:text-gray-300">
                  Answer: {current.answer}
                </p>
              ) : null}
            </div>
          ) : null}
          {showRecoveryFeedback ? (
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              Got it — nice recovery 💡
            </p>
          ) : null}
        </>
      )}

      {isComplete && sessionType === "challenge" && (
        <ChallengeSummary
          correctCount={correctCount}
          totalQuestions={total}
          totalIncorrect={totalIncorrect}
          reviewFlashcardIds={reviewFlashcardIds}
          onReviewCards={onReviewCards}
          onRestart={onRestartChallenge}
          onExit={onBackToModes}
        />
      )}
      {isComplete && sessionType === "review" && (
        <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {reviewSummaryTitle}
            </h2>
            <p className="mt-4 text-center text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {reviewSummaryMainStat}
            </p>
            <div className="mt-4 space-y-1 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>
                Before: {previousPerformance?.previousCorrect ?? 0} /{" "}
                {previousPerformance?.previousTotal ?? 0}
              </p>
              <p>
                Now: {correctCount} / {total}
              </p>
            </div>
            {previousIncorrect > 0 ? (
              <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                You&apos;ve mastered {masteredCount} of {previousIncorrect} review cards
              </p>
            ) : null}
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              {reviewSummaryMessage}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void onContinueChallenge?.()}
              className="w-full rounded-xl bg-black py-3.5 text-center text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] dark:bg-white dark:text-black"
            >
              Continue Challenge
            </button>
            {totalIncorrect > 0 && onReviewCards ? (
              <button
                type="button"
                onClick={() => void onReviewCards()}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-center text-sm font-medium text-gray-900 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                Review again
              </button>
            ) : null}
            <button
              type="button"
              onClick={onBackToModes}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 text-center text-sm font-medium text-gray-900 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              Back to Notes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
