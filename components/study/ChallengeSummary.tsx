"use client";

import { useEffect, useState } from "react";

export type ChallengeSummaryProps = {
  correctCount: number;
  totalQuestions: number;
  totalIncorrect?: number;
  onRestart: () => void;
  onExit: () => void;
};

const cardBase =
  "rounded-2xl border border-gray-100 bg-white shadow-md dark:border-gray-800 dark:bg-gray-900";

export default function ChallengeSummary({
  correctCount,
  totalQuestions,
  totalIncorrect = 0,
  onRestart,
  onExit,
}: ChallengeSummaryProps) {
  const [entered, setEntered] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const incorrectCount = totalIncorrect;

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
      ? `You got ${incorrectCount} cards wrong — restart the session to keep practicing with your current focus.`
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
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={isRestarting}
          onClick={handleRestart}
          className={[
            "w-full rounded-xl bg-black py-3.5 text-center text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] dark:bg-white dark:text-black",
            isRestarting ? "opacity-70" : "",
          ].join(" ")}
        >
          Restart session
        </button>
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
