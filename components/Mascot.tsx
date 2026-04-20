"use client";

import { motion } from "framer-motion";

type MascotProps = {
  mood: string;
  tired?: boolean;
};

export default function Mascot({ mood, tired }: MascotProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "100px",
        right: "20px",
        zIndex: 99999,
      }}
    >
      <motion.div
  animate={{
    y: [0, -8, 0], // floating motion
    scale:
      mood === "happy"
        ? [1, 1.15, 1]
        : mood === "sad"
        ? [1, 0.9, 1]
        : [1, 1.02, 1],
    scaleX:
      mood === "happy"
        ? [1, 1.1, 1]
        : mood === "sad"
        ? [1, 0.95, 1]
        : [1, 1.02, 1],
    scaleY:
      mood === "happy"
        ? [1, 0.95, 1]
        : mood === "sad"
        ? [1, 1.05, 1]
        : [1, 0.98, 1],
  }}
  transition={{
    y: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
    scale: {
      duration: 0.4,
    },
    scaleX: {
      duration: 0.4,
    },
    scaleY: {
      duration: 0.4,
    },
  }}
>
        <svg width="80" height="80" viewBox="0 0 100 100">
          <defs>
            <radialGradient id="blobGradient" cx="35%" cy="30%" r="70%">
              <stop
                offset="0%"
                stopColor={
                  mood === "happy"
                    ? "#dcfce7"
                    : mood === "sad"
                    ? "#fee2e2"
                    : "#e0e7ff"
                }
              />
              <stop
                offset="100%"
                stopColor={
                  mood === "happy"
                    ? "#86efac"
                    : mood === "sad"
                    ? "#f87171"
                    : "#818cf8"
                }
              />
            </radialGradient>
          </defs>

          {/* Blob */}
          <path
  d="M50 15 C68 12, 82 22, 85 35 C88 50, 82 70, 65 82 C50 90, 30 85, 20 70 C10 55, 15 30, 30 20 C40 12, 50 15, 50 15 Z"
  fill="url(#blobGradient)"
  style={{
  filter:
    mood === "happy"
      ? "blur(0.3px) drop-shadow(0 0 10px rgba(34,197,94,0.5))"
      : mood === "sad"
      ? "blur(0.3px) drop-shadow(0 0 8px rgba(239,68,68,0.4))"
      : "none",
}}
/>

          {/* Eyes */}
          <motion.circle
            cx="44"
            cy="48"
            r="5"
            fill="#111"
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              times: [0, 0.7, 0.75, 0.8, 1],
            }}
          />

          <motion.circle
            cx="58"
            cy="48"
            r="5"
            fill="#111"
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              times: [0, 0.7, 0.75, 0.8, 1],
            }}
          />

          {/* Eye shine */}
          <circle cx="46" cy="46" r="1.5" fill="white" />
          <circle cx="60" cy="46" r="1.5" fill="white" />

          {/* Mouth */}
          {mood === "happy" && (
            <path
              d="M45 62 Q51 68 57 62"
              stroke="#111"
              strokeWidth="2.5"
              fill="transparent"
              strokeLinecap="round"
            />
          )}

          {mood === "sad" && (
            <path
              d="M45 68 Q51 60 57 68"
              stroke="#111"
              strokeWidth="2.5"
              fill="transparent"
              strokeLinecap="round"
            />
          )}

          {tired && (
  <line
    x1="45"
    y1="68"
    x2="57"
    y2="68"
    stroke="#111"
    strokeWidth="2.5"
    strokeLinecap="round"
  />
)}

{!tired && mood === "happy" && (
  <path
    d="M45 62 Q51 68 57 62"
    stroke="#111"
    strokeWidth="2.5"
    fill="transparent"
    strokeLinecap="round"
  />
)}

{!tired && mood === "sad" && (
  <path
    d="M45 68 Q51 60 57 68"
    stroke="#111"
    strokeWidth="2.5"
    fill="transparent"
    strokeLinecap="round"
  />
)}

{!tired && mood === "idle" && (
  <line
    x1="45"
    y1="65"
    x2="57"
    y2="65"
    stroke="#111"
    strokeWidth="2.5"
    strokeLinecap="round"
  />
)}
        </svg>
      </motion.div>
    </div>
  );
}