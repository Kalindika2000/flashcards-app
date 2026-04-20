"use client";

import { useEffect, useState } from "react";

export type ChallengeSummaryProps = {
  correctCount: number;
  totalQuestions: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
  weakCardsCount?: number;
  weakFlashcardIds?: string[];
  onReviewWeakCards?: () => void | Promise<void>;
  /** Prior run was a targeted weak-card review (not the main deck challenge). */
  isReviewSession?: boolean;
  onRestart: () => void;
  onExit: () => void;
};

const cardBase =
  "rounded-2xl border border-gray-100 bg-white shadow-md dark:border-gray-800 dark:bg-gray-900";

export default function ChallengeSummary({
  correctCount,
  totalQuestions,
  difficultyBreakdown,
  weakCardsCount: _weakCardsCount,
  weakFlashcardIds,
  onReviewWeakCards,
  isReviewSession = false,
  onRestart,
  onExit,
}: ChallengeSummaryProps) {
  const [entered, setEntered] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [reviewCtaEntered, setReviewCtaEntered] = useState(false);

  const weakCount = weakFlashcardIds?.length ?? 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (weakCount === 0 || !onReviewWeakCards) {
      setReviewCtaEntered(false);
      return;
    }
    setReviewCtaEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReviewCtaEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [weakCount, onReviewWeakCards]);

  const accuracy =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  const title =
    accuracy >= 70 || correctCount === totalQuestions
      ? "Nice work!"
      : "Challenge Complete";

  const hardCount = difficultyBreakdown.hard ?? 0;
  const mediumCount = difficultyBreakdown.medium ?? 0;

  let insight = "";
  if (hardCount > 0) {
    insight = `Focus on ${hardCount} harder card${hardCount > 1 ? "s" : ""} next`;
  } else if (mediumCount > 0) {
    insight = `You're close—review ${mediumCount} medium card${mediumCount > 1 ? "s" : ""}`;
  } else {
    insight = "Great job—you're strong across all cards";
  }

  const progressColor =
    accuracy >= 80
      ? "bg-green-500"
      : accuracy >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  const handleRestart = () => {
    if (isRestarting) return;
    setIsRestarting(true);
    onRestart();
  };

  return (
    <div
      className={[
        "mx-auto flex max-w-lg flex-col gap-8 px-6 py-10 transition-all duration-300",
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      ].join(" ")}
    >
      <header>
        <h1 className="text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
      </header>

      <section className={`${cardBase} p-6`} aria-label="Score">
        <p className="text-center text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-50">
          {correctCount} / {totalQuestions}
        </p>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Score
        </p>
        <p className="mt-6 text-center text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {accuracy}%
        </p>
        <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          Accuracy
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full ${progressColor} transition-all duration-500`}
            style={{
              width: `${accuracy}%`,
              transitionDelay: "150ms",
            }}
          />
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <p className="text-center text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Performance
        </p>
        <section className={`${cardBase} p-5`} aria-label="Difficulty mix">
          <div className="flex items-center justify-between border-b border-gray-100 py-2 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span aria-hidden>🟢</span>
              <span>Easy</span>
            </div>
            <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {difficultyBreakdown.easy}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 py-2 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
              <span aria-hidden>🟡</span>
              <span>Medium</span>
            </div>
            <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {difficultyBreakdown.medium}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <span aria-hidden>🔴</span>
              <span>Hard</span>
            </div>
            <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {difficultyBreakdown.hard}
            </span>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-center text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Recommendation
        </p>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {insight}
        </p>
        {isReviewSession ? (
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            {accuracy >= 70
              ? "Nice—these cards are improving"
              : "You've reviewed your weak cards"}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {weakCount > 0 && onReviewWeakCards ? (
          <div
            className={[
              "flex flex-col gap-1 transition-all duration-300",
              reviewCtaEntered
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => void onReviewWeakCards()}
              className="w-full rounded-xl bg-green-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:scale-[1.02] hover:bg-green-600 active:scale-[0.98]"
            >
              Review {weakCount} weak card{weakCount > 1 ? "s" : ""}
            </button>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Practice what you just missed
            </p>
          </div>
        ) : null}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isRestarting}
            onClick={handleRestart}
            className={[
              "flex-1 rounded-xl bg-black py-3 text-center text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] dark:bg-white dark:text-black",
              isRestarting ? "opacity-70" : "",
            ].join(" ")}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-3 text-center text-sm font-medium text-gray-900 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            Back to Notes
          </button>
        </div>
      </div>
    </div>
  );
}
