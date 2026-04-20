"use client";

import { motion } from "framer-motion";
import type { ChallengeAnswerResult } from "@/features/study/types/challengeQuestion";

type RevealCardProps = {
  questionText: string;
  answerText: string;
  revealed: boolean;
  onReveal: () => void;
  onAnswer: (result: ChallengeAnswerResult) => void;
};

export default function RevealCard({
  questionText,
  answerText,
  revealed,
  onReveal,
  onAnswer,
}: RevealCardProps) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontWeight: "bold", marginTop: "10px", fontSize: "16px" }}>
        {questionText}
      </p>

      {!revealed ? (
        <div style={{ marginTop: "20px" }}>
          <button
            type="button"
            onClick={onReveal}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Reveal Answer
          </button>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              marginTop: "20px",
              padding: "14px",
              background: "#eef2ff",
              borderRadius: "10px",
              border: "1px solid #c7d2fe",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#4f46e5",
                marginBottom: "6px",
                letterSpacing: "0.5px",
              }}
            >
              ANSWER
            </div>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>{answerText}</div>
          </motion.div>

          <motion.div
            className="mt-5 flex justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginTop: "20px" }}
          >
            <button
              type="button"
              onClick={() => onAnswer("correct")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                background: "#16a34a",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Correct
            </button>
            <button
              type="button"
              onClick={() => onAnswer("incorrect")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                background: "#dc2626",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Incorrect
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}
