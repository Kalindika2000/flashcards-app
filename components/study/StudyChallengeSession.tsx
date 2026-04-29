"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  ChallengeAnswerResult,
  ChallengeQuestion,
} from "@/features/study/types/challengeQuestion";
import ChallengeSummary from "@/components/study/ChallengeSummary";
import { QuestionRenderer } from "@/components/study/QuestionRenderer";
import { getHints } from "@/lib/hintService";

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
  answerResultsByFlashcardId?: Record<string, ChallengeAnswerResult>;
  /** Count of distinct flashcards answered incorrectly (for summary). */
  totalIncorrectFlashcards?: number;
  /** When true, session was built with weak-card focus (selection may still fall back if deck is uniformly strong). */
  focusWeakCards?: boolean;
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
  answerResultsByFlashcardId = {},
  totalIncorrectFlashcards = 0,
  focusWeakCards = false,
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
    ],
  );

  const totalIncorrect = totalIncorrectFlashcards;
  const currentFlashcardId = current?.flashcardId?.trim() ?? "";
  const currentAttemptCount =
    currentFlashcardId.length > 0 ? (cardAttemptCounts[currentFlashcardId] ?? 0) : 0;
  const currentResult =
    currentFlashcardId.length > 0
      ? answerResultsByFlashcardId[currentFlashcardId]
      : undefined;
  const currentIncorrectCount =
    currentFlashcardId.length > 0 ? (cardIncorrectCounts[currentFlashcardId] ?? 0) : 0;
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
    currentIncorrectCount >= 2 &&
    !hintAlreadyShown &&
    currentFlashcardId.length > 0;
  const shouldShowPartialHint =
    !isComplete &&
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
    currentResult === "correct" &&
    currentFlashcardId.length > 0 &&
    showRecoveryForCardId === currentFlashcardId &&
    currentIncorrectCount >= 2;

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

      {isComplete && (
        <ChallengeSummary
          correctCount={correctCount}
          totalQuestions={total}
          totalIncorrect={totalIncorrect}
          onRestart={onRestartChallenge}
          onExit={onBackToModes}
        />
      )}
    </>
  );
}
