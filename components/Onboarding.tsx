"use client";

import { useState } from "react";

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);

  const screens = [
    {
      title: "Welcome",
      text: "Turn your notes into flashcards instantly.",
    },
    {
      title: "Study smarter",
      text: "Flip cards and track what you know.",
    },
    {
      title: "Build streaks",
      text: "Stay consistent and improve faster.",
    },
  ];

  const current = screens[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        zIndex: 999999,
      }}
    >
      <h2>{current.title}</h2>

      <p style={{ marginTop: "10px", textAlign: "center" }}>
        {current.text}
      </p>

      <button
        onClick={() => {
          if (step < screens.length - 1) {
            setStep(step + 1);
          } else {
            localStorage.setItem("seenOnboarding", "true");
            onFinish();
          }
        }}
        style={{
          marginTop: "30px",
          padding: "12px 20px",
          borderRadius: "10px",
          border: "none",
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
        }}
      >
        {step === screens.length - 1 ? "Get Started" : "Next"}
      </button>
    </div>
  );
}