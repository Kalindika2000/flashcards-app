"use client";

import { useEffect, useRef } from "react";

export default function ModeSelection({
  onSelectFlashcards,
  onSelectChallenge,
  onSelectSimulation,
  focusWeakCards,
  onFocusWeakCardsChange,
}: {
  onSelectFlashcards: () => void;
  onSelectChallenge: () => void;
  onSelectSimulation: () => void;
  focusWeakCards: boolean;
  onFocusWeakCardsChange: (value: boolean) => void;
}) {
  const modeSelectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeSelectGuardRef = useRef(false);

  useEffect(() => {
    return () => {
      if (modeSelectTimeoutRef.current != null) {
        clearTimeout(modeSelectTimeoutRef.current);
        modeSelectTimeoutRef.current = null;
      }
      modeSelectGuardRef.current = false;
    };
  }, []);

  const scheduleModeSelect = (run: () => void) => {
    if (modeSelectGuardRef.current) return;
    modeSelectGuardRef.current = true;
    modeSelectTimeoutRef.current = setTimeout(() => {
      modeSelectTimeoutRef.current = null;
      try {
        run();
      } finally {
        modeSelectGuardRef.current = false;
      }
    }, 100);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="space-y-3">
          <p className="text-left text-lg font-semibold text-gray-800 dark:text-gray-100">
            Learning & Practice
          </p>

          <div className="flex w-full items-center justify-between">
            <label
              htmlFor="focus-weak-toggle"
              className="cursor-pointer text-sm text-gray-600 dark:text-gray-300"
            >
              Focus on weak cards
            </label>
            <button
              id="focus-weak-toggle"
              type="button"
              onClick={() => onFocusWeakCardsChange(!focusWeakCards)}
              aria-pressed={focusWeakCards}
              aria-label="Focus on weak cards toggle"
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-white active:scale-95 dark:focus:ring-offset-gray-900 ${
                focusWeakCards ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  focusWeakCards ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {focusWeakCards ? (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Focusing on cards you need to improve
            </p>
          ) : null}

          <div className="space-y-3">
            <button
              onClick={() => {
                scheduleModeSelect(() => {
                  onSelectFlashcards();
                });
              }}
              className="mode-button w-full cursor-pointer rounded-2xl border p-5 transition-all duration-150 hover:shadow-2xl hover:brightness-105"
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "600" }}>
                <span className="mr-2">📚</span>
                Flashcards
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>
                Quick recall with swipe-based review
              </div>
            </button>

            <button
              onClick={() => {
                scheduleModeSelect(() => {
                  onSelectChallenge();
                });
              }}
              className="mode-button w-full cursor-pointer rounded-2xl border p-5 transition-all duration-150 hover:shadow-2xl hover:brightness-105"
              style={{
                backgroundColor: "#10b981",
                color: "white",
                boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "600" }}>
                <span className="mr-2">⚡</span>
                Challenge Mode
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>
                Timed questions with scoring
              </div>
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-left text-lg font-semibold text-gray-800 dark:text-gray-100">
            Test Yourself
          </p>
          <button
            onClick={() => {
              scheduleModeSelect(() => {
                onSelectSimulation();
              });
            }}
            className="mode-button w-full cursor-pointer rounded-2xl border p-5 transition-all duration-150 hover:shadow-2xl hover:brightness-105"
            style={{
              backgroundColor: "#7c3aed",
              color: "white",
              boxShadow: "0 8px 20px rgba(124, 58, 237, 0.25)",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: "600" }}>
              <span className="mr-2">🎯</span>
              Simulation Mode
            </div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>
              Exam-style full practice sessions
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
