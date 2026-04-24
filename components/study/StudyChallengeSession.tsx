"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  ChallengeAnswerResult,
  ChallengeQuestion,
} from "@/features/study/types/challengeQuestion";
import ChallengeSummary from "@/components/study/ChallengeSummary";
import { QuestionRenderer } from "@/components/study/QuestionRenderer";
import { useAuth } from "@/components/auth/AuthProvider";
import { getHints } from "@/lib/hintService";
import { updateCardStats } from "@/lib/userCardStats";

/** Fade current card shortly before auto-advance (matches hook delay tail). */
const TRANSITION_OUT_DELAY_MS = 600;
const RECOVERY_FEEDBACK_MS = 1200;

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
  reviewIncorrectCountsByFlashcardId?: Record<string, number>;
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
  reviewIncorrectCountsByFlashcardId = {},
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
  const { user } = useAuth();
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
  const [hintsByCard, setHintsByCard] = useState<Record<string, string[]>>({});
  const [hintVisibleByCard, setHintVisibleByCard] = useState<Record<string, boolean>>(
    {},
  );
  const [hintDismissedByCard, setHintDismissedByCard] = useState<
    Record<string, boolean>
  >({});
  const [showRecoveryForCardId, setShowRecoveryForCardId] = useState<string | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintHideTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
    // When a card is shown, allow hint UI to render again for this card.
    setHintVisibleByCard((prev) => ({ ...prev, [id]: true }));
    setHintDismissedByCard((prev) => ({ ...prev, [id]: false }));
  }, [current?.flashcardId, isComplete]);

  // Reset hint-related UI and per-card counters for each new session payload.
  useEffect(() => {
    setCardAttemptCounts({});
    setCardIncorrectCounts({});
    setHintRevealedByCard({});
    setHintAnswerRevealedByCard({});
    setHintVisibleByCard({});
    setHintDismissedByCard({});
    for (const timer of Object.values(hintHideTimersRef.current)) {
      clearTimeout(timer);
    }
    hintHideTimersRef.current = {};
  }, [questions]);

  useEffect(() => {
    const id = current?.flashcardId?.trim() ?? "";
    if (!id || !current) return;
    if (hintsByCard[id]) return;
    let cancelled = false;
    void getHints(current.question, current.answer).then((hints) => {
      if (cancelled) return;
      setHintsByCard((prev) => {
        if (prev[id]) return prev;
        return { ...prev, [id]: hints };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [current, hintsByCard]);

  useEffect(() => {
    return () => {
      if (transitionOutTimerRef.current) {
        clearTimeout(transitionOutTimerRef.current);
      }
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
      for (const timer of Object.values(hintHideTimersRef.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  const hideHintWithFade = useCallback((flashcardId: string) => {
    const id = flashcardId.trim();
    if (!id) return;
    setHintVisibleByCard((prev) => ({ ...prev, [id]: false }));
    if (hintHideTimersRef.current[id]) {
      clearTimeout(hintHideTimersRef.current[id]);
    }
    hintHideTimersRef.current[id] = setTimeout(() => {
      setHintDismissedByCard((prev) => ({ ...prev, [id]: true }));
      setHintRevealedByCard((prev) => ({ ...prev, [id]: false }));
      setHintAnswerRevealedByCard((prev) => ({ ...prev, [id]: false }));
      delete hintHideTimersRef.current[id];
    }, 200);
  }, []);

  const handleRevealWithHintHide = useCallback(() => {
    const id = current?.flashcardId?.trim();
    if (id) hideHintWithFade(id);
    onRevealAnswer();
  }, [current?.flashcardId, hideHintWithFade, onRevealAnswer]);

  const handleAnswerWithTransition = useCallback(
    (result: ChallengeAnswerResult) => {
      const id = current?.flashcardId?.trim();
      const usedHint = Boolean(id && hintRevealedByCard[id]);
      if (id && result === "incorrect") {
        setCardIncorrectCounts((prev) => ({
          ...prev,
          [id]: (prev[id] ?? 0) + 1,
        }));
      }
      if (id) {
        hideHintWithFade(id);
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
      if (user?.uid && id) {
        void (async () => {
          try {
            await updateCardStats({
              userId: user.uid,
              cardId: id,
              isCorrect: result === "correct",
              usedHint,
              debugContext:
                sessionType === "review"
                  ? "ChallengeMode|Review|answer|user_card_stats"
                  : "ChallengeMode|Challenge|answer|user_card_stats",
            });
          } catch (err) {
            console.error("[StudyChallengeSession] updateCardStats", err);
          }
        })();
      }
      if (transitionOutTimerRef.current) {
        clearTimeout(transitionOutTimerRef.current);
      }
      transitionOutTimerRef.current = setTimeout(() => {
        setIsTransitioning(true);
        transitionOutTimerRef.current = null;
      }, TRANSITION_OUT_DELAY_MS);
    },
    [
      cardIncorrectCounts,
      current?.flashcardId,
      hideHintWithFade,
      hintRevealedByCard,
      onAnswer,
      sessionType,
      user?.uid,
    ],
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
    currentFlashcardId.length > 0
      ? Math.max(
          cardIncorrectCounts[currentFlashcardId] ?? 0,
          reviewIncorrectCountsByFlashcardId[currentFlashcardId] ?? 0,
        )
      : 0;
  const hintThreshold = 2;
  const hints = hintsByCard[currentFlashcardId] ?? [];
  const hintIndex = Math.min(Math.max(currentIncorrectCount - hintThreshold, 0), 3);
  const hint = hints[hintIndex];
  const canRevealFullAnswer = currentIncorrectCount >= 4;
  const hintAlreadyShown =
    currentFlashcardId.length > 0
      ? Boolean(hintRevealedByCard[currentFlashcardId])
      : false;
  const shouldShowHintPrompt =
    !isComplete &&
    sessionType === "review" &&
    currentIncorrectCount >= 2 &&
    !hintAlreadyShown &&
    currentFlashcardId.length > 0;
  const shouldShowPartialHint =
    !isComplete &&
    sessionType === "review" &&
    currentFlashcardId.length > 0 &&
    Boolean(hintRevealedByCard[currentFlashcardId]);
  const shouldShowHintAnswer =
    shouldShowPartialHint &&
    currentFlashcardId.length > 0 &&
    Boolean(hintAnswerRevealedByCard[currentFlashcardId]);
  const isHintVisible =
    currentFlashcardId.length > 0 ? hintVisibleByCard[currentFlashcardId] !== false : true;
  const isHintDismissed =
    currentFlashcardId.length > 0 ? Boolean(hintDismissedByCard[currentFlashcardId]) : false;
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
                onReveal={handleRevealWithHintHide}
                onAnswer={handleAnswerWithTransition}
              />
            </div>
          </motion.div>
          {focusWeakCards ? (
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              🎯 Focusing on cards you need to improve
            </p>
          ) : null}
          {shouldShowHintPrompt && !isHintDismissed ? (
            <div
              className={[
                "mt-2 flex flex-col items-center gap-2 transition-opacity duration-200",
                isHintVisible ? "opacity-100" : "opacity-0",
              ].join(" ")}
            >
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
          {shouldShowPartialHint && current && !isHintDismissed && hint ? (
            <div
              className={[
                "mt-2 flex flex-col items-center gap-2 transition-opacity duration-200",
                isHintVisible ? "opacity-100" : "opacity-0",
              ].join(" ")}
            >
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Here&apos;s a clue: {hint}
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
          onContinueChallenge={onContinueChallenge}
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
