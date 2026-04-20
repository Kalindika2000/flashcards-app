"use client";

import type { Challenge } from "@/features/generation/types/challenge";

type EditorChallengePreviewProps = {
  challenges: Challenge[];
  challengeIndex: number;
  showChallengeAnswer: boolean;
  onRevealAnswer: () => void;
  onPrevChallenge: () => void;
  onNextChallenge: () => void;
};

export function EditorChallengePreview({
  challenges,
  challengeIndex,
  showChallengeAnswer,
  onRevealAnswer,
  onPrevChallenge,
  onNextChallenge,
}: EditorChallengePreviewProps) {
  if (challenges.length === 0) return null;

  const current = challenges[challengeIndex];

  return (
    <>
      <div style={{ maxWidth: "600px", width: "100%", marginBottom: "20px" }}>
        <h3>Challenge Clips</h3>

        {challenges.map((c, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "8px",
            }}
          >
            <p>
              <strong>{c.hook}</strong>
            </p>
            <p>{c.context}</p>
            <p>{c.question}</p>
            <p>
              <strong>Answer:</strong> {c.answer}
            </p>
            <p>{c.explanation}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          marginBottom: "20px",
          border: "2px solid #16a34a",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <h3>Swipe Mode</h3>

        <div style={{ textAlign: "center" }}>
          <h2>{current?.hook}</h2>

          <p>{current?.context}</p>

          <p style={{ fontWeight: "bold", marginTop: "10px" }}>
            {current?.question}
          </p>

          {!showChallengeAnswer ? (
            <button
              type="button"
              onClick={onRevealAnswer}
              style={{ marginTop: "15px" }}
            >
              Reveal Answer
            </button>
          ) : (
            <>
              <p style={{ marginTop: "15px", fontWeight: "bold" }}>
                Answer: {current?.answer}
              </p>
              <p>{current?.explanation}</p>
            </>
          )}

          <div style={{ marginTop: "20px" }}>
            <button
              type="button"
              onClick={onPrevChallenge}
              style={{ marginRight: "10px" }}
            >
              {"\u2B05"} Prev
            </button>

            <button type="button" onClick={onNextChallenge}>
              Next {"\u27A1"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
