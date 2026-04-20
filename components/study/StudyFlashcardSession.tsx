"use client";

import { motion } from "framer-motion";
import type { Flashcard } from "@/features/study/types/flashcard";

type StudyFlashcardSessionProps = {
  currentCard: Flashcard | undefined;
  flipped: boolean;
  onToggleFlip: () => void;
  showFeedback: null | "known" | "unknown";
  onMarkCard: (isCorrect: boolean) => void;
  currentIndex: number;
  activeCardsLength: number;
  streak: number;
  bestStreak: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function StudyFlashcardSession({
  currentCard,
  flipped,
  onToggleFlip,
  showFeedback,
  onMarkCard,
  currentIndex,
  activeCardsLength,
  streak,
  bestStreak,
  onPrev,
  onNext,
}: StudyFlashcardSessionProps) {
  return (
    <>
      <div
        style={{
          width: "100%",
          marginTop: "20px",
          marginBottom: "50px",
        }}
      >
        <div style={{ width: "100%", margin: "0 auto" }}>
          <motion.div
            onClick={onToggleFlip}
            style={{
              width: "90%",
              height: "200px",
              marginTop: "20px",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <motion.div
              animate={{
                rotateY: flipped ? 180 : 0,
                opacity: flipped ? 0 : 1,
              }}
              transition={{ duration: 0.4 }}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                background: "#e5e5e5",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px 20px 20px",
                textAlign: "center",
                backfaceVisibility: "hidden",
                overflowY: "auto",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "600" }}>
                {currentCard?.question}
              </div>
            </motion.div>

            <motion.div
              animate={{
                rotateY: flipped ? 0 : -180,
                opacity: flipped ? 1 : 0,
              }}
              transition={{ duration: 0.4 }}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                background: "#dbeafe",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px 20px 20px",
                textAlign: "center",
                backfaceVisibility: "hidden",
                overflowY: "auto",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "600" }}>
                {currentCard?.answer}
              </div>
            </motion.div>

            {currentCard?.known && (
              <div
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "-30px",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                  zIndex: 10,
                }}
              >
                ✓
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div
        style={{
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "10px",
          position: "relative",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{
            opacity: showFeedback ? 1 : 0,
            y: showFeedback ? 0 : -4,
            scale: showFeedback ? 1 : 0.98,
          }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
          style={{
            fontWeight: "600",
            color: showFeedback === "known" ? "#16a34a" : "#ef4444",
          }}
        >
          {showFeedback === "known"
            ? "🔥 Nice!"
            : showFeedback === "unknown"
              ? "↺ Keep practicing"
              : ""}
        </motion.div>
      </div>

      {flipped && (
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button onClick={() => onMarkCard(true)}>Easy</button>
          <button onClick={() => onMarkCard(false)} style={{ marginLeft: "12px" }}>
            🔁 Needs Review
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: "70px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>
          Card {currentIndex + 1} / {activeCardsLength}
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          <div
            style={{
              background: "#f3f4f6",
              padding: "8px 12px",
              borderRadius: "10px",
            }}
          >
            🔥 Streak: <strong>{streak}</strong>
          </div>
          <div
            style={{
              background: "#f3f4f6",
              padding: "8px 12px",
              borderRadius: "10px",
            }}
          >
            🏆 Best: <strong>{bestStreak}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onPrev}>Prev</button>
          <button onClick={onNext}>
            {currentIndex === activeCardsLength - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
