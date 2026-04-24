"use client";

import { useEffect, useState } from "react";

export type ChallengeSummaryProps = {
  correctCount: number;
  totalQuestions: number;
  totalIncorrect?: number;
  reviewFlashcardIds?: string[];
  onReviewCards?: () => void | Promise<void>;
  onRestart: () => void;
  onContinueChallenge?: () => void | Promise<void>;
  onExit: () => void;
};

const cardBase =
  "rounded-2xl border border-gray-100 bg-white shadow-md dark:border-gray-800 dark:bg-gray-900";

export default function ChallengeSummary({
  correctCount,
  totalQuestions,
  totalIncorrect,
  reviewFlashcardIds,
  onReviewCards,
  onRestart,
  onContinueChallenge,
  onExit,
}: ChallengeSummaryProps) {
  const [entered, setEntered] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [reviewCtaEntered, setReviewCtaEntered] = useState(false);

  const reviewCountFromIds = reviewFlashcardIds?.length ?? 0;
  const incorrectCount = totalIncorrect ?? reviewCountFromIds;

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (incorrectCount <= 0 || !onReviewCards) {
      setReviewCtaEntered(false);
      return;
    }
    setReviewCtaEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReviewCtaEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [incorrectCount, onReviewCards]);

  const accuracy =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  const title =
    accuracy >= 70 || correctCount === totalQuestions
      ? "Nice work!"
      : "Challenge Complete";

  const recommendation =
    incorrectCount > 0
      ? `You got ${incorrectCount} cards wrong — reviewing them now is the fastest way to improve.`
      : "Perfect score. Great job!";

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
        <section className={`${cardBase} p-5`} aria-label="Performance breakdown">
          <p className="mb-3 text-center text-sm text-gray-500 dark:text-gray-400">
            Score: {correctCount} / {totalQuestions}
          </p>
          <div className="flex items-center justify-between border-b border-gray-100 py-2 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span>Correct</span>
            </div>
            <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {correctCount}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <span>Incorrect</span>
            </div>
            <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {incorrectCount}
            </span>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-center text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Recommendation
        </p>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {recommendation}
        </p>
        {incorrectCount > 0 ? (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Focused on the cards you got wrong
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {incorrectCount > 0 && onReviewCards ? (
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
              onClick={() => void onReviewCards()}
              className="w-full rounded-xl bg-green-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:scale-[1.02] hover:bg-green-600 active:scale-[0.98]"
            >
              Review {incorrectCount} review cards
            </button>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Focus on the cards you just missed
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={isRestarting}
              onClick={() => {
                console.log("[UI] Retry Weak Cards clicked");
                handleRestart();
              }}
              className={[
                "w-full rounded-xl bg-black py-3.5 text-center text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] dark:bg-white dark:text-black",
                isRestarting ? "opacity-70" : "",
              ].join(" ")}
            >
              🔁 Retry Weak Cards
            </button>
            <button
              type="button"
              onClick={() => {
                console.log("[UI] Start Full Challenge clicked");
                void onContinueChallenge?.();
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-center text-sm font-medium text-gray-900 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              🎯 Start Full Challenge
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onExit}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-center text-sm font-medium text-gray-900 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            Back to Notes
          </button>
        </div>
      </div>
    </div>
  );
}
