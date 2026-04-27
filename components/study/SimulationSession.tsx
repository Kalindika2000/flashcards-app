"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Flashcard } from "@/features/study/types/flashcard";
import {
  attachStats,
  selectFlashcardsForChallengeSession,
  stripConfidence,
} from "@/features/study/utils/challengeFlashcardSelection";
import {
  startSimulation,
  nextSimulationStep,
  type SimulationDifficulty,
  type SimulationScenarioType,
  type SimulationMessage,
} from "@/lib/services/simulationService";
import { evaluateSimulation } from "@/lib/services/simulationEvaluationService";
import { updateFlashcardStats } from "@/lib/services/updateFlashcardStats";
import { generateScenario } from "@/lib/services/simulationScenarioService";
import { inferRole } from "@/lib/services/roleInferenceService";
import { getNoteById } from "@/lib/repositories/notesRepository";
import { formatNoteContent } from "@/lib/utils/formatNoteContent";
import { useStudyData } from "@/features/study/hooks/useStudyData";

type SimulationSessionProps = {
  noteId: string;
  onBackToStudyModes?: () => void;
};

export default function SimulationSession({
  noteId,
  onBackToStudyModes,
}: SimulationSessionProps) {
  const { user, loading: authLoading } = useAuth();
  const trimmedNoteId = noteId.trim();
  const simulationGoal = "Recommend the best approach";
  const [inferredRole, setInferredRole] = useState("Professional");
  const [roleInferLoading, setRoleInferLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [selectedFlashcards, setSelectedFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading simulation...");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<SimulationMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [difficulty, setDifficulty] = useState<SimulationDifficulty>("medium");
  const [scenarioType, setScenarioType] =
    useState<SimulationScenarioType>("intervention");
  const [generatedScenario, setGeneratedScenario] = useState("");
  const [finalAnswer, setFinalAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answerResult, setAnswerResult] = useState<
    "correct" | "partial" | "incorrect" | null
  >(null);
  const [processResult, setProcessResult] = useState<"good" | "average" | "poor" | null>(
    null,
  );
  const [coverageResult, setCoverageResult] = useState<"high" | "medium" | "low" | null>(
    null,
  );
  const [feedback, setFeedback] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [isReferenceNotesOpen, setIsReferenceNotesOpen] = useState(false);
  const attemptedAutoGenerateRef = useRef(false);
  const startedSimulationRef = useRef(false);
  const simulationStartGenerationRef = useRef(0);
  const onFlashcardsGenerated = useCallback(() => {}, []);

  const hasUserMessage = messages.some((m) => m.role === "user");
  const formattedReferenceNotes = useMemo(
    () => formatNoteContent(referenceNotes),
    [referenceNotes],
  );

  const { loadFlashcards, handleGenerateFlashcards } = useStudyData({
    noteId: trimmedNoteId || null,
    deckId: undefined,
    setFlashcards,
    onFlashcardsGenerated,
  });

  const buildSimulationPool = useCallback(
    (
      cardsWithStats: Array<Flashcard & { confidence: number; lastSeenAt: number | null }>,
    ) => {
      if (difficulty === "medium") {
        return cardsWithStats;
      }

      const easyCards = cardsWithStats.filter((c) => c.difficulty === "easy");
      const mediumCards = cardsWithStats.filter((c) => c.difficulty === "medium");
      const hardCards = cardsWithStats.filter((c) => c.difficulty === "hard");
      const weakCards = [...cardsWithStats]
        .sort((a, b) => a.confidence - b.confidence)
        .filter((c) => c.confidence < 0.5);

      if (difficulty === "easy") {
        const easyNonWeak = easyCards.filter((c) => c.confidence >= 0.5);
        const mediumNonWeak = mediumCards.filter((c) => c.confidence >= 0.5);
        const easyWeak = easyCards.filter((c) => c.confidence < 0.5);
        const pool = [
          ...easyNonWeak,
          ...mediumNonWeak.slice(0, 3),
          ...easyWeak.slice(0, 1),
        ];
        return pool.length > 0 ? pool : cardsWithStats;
      }

      const mediumHardCards = [...hardCards, ...mediumCards];
      const weakMediumHard = weakCards.filter((c) =>
        c.difficulty === "hard" || c.difficulty === "medium");
      const nonWeakMediumHard = mediumHardCards.filter(
        (c) => !weakMediumHard.some((w) => w.id === c.id),
      );
      const pool = [...weakMediumHard, ...nonWeakMediumHard, ...easyCards.slice(0, 2)];
      return pool.length > 0 ? pool : cardsWithStats;
    },
    [difficulty],
  );

  useEffect(() => {
    attemptedAutoGenerateRef.current = false;
    startedSimulationRef.current = false;
    simulationStartGenerationRef.current += 1;
  }, [trimmedNoteId, user?.uid]);

  useEffect(() => {
    if (!trimmedNoteId || !user?.uid) {
      setRoleInferLoading(false);
      setInferredRole("Professional");
      return;
    }

    let cancelled = false;
    setRoleInferLoading(true);

    const run = async () => {
      try {
        const noteData = await getNoteById(trimmedNoteId, user.uid);
        if (cancelled) return;
        const content = noteData?.content?.trim() ?? "";
        setReferenceNotes(content);
        if (!content) {
          setInferredRole("Professional");
          return;
        }
        const role = await inferRole(content);
        if (!cancelled) setInferredRole(role);
      } catch {
        if (!cancelled) setInferredRole("Professional");
      } finally {
        if (!cancelled) setRoleInferLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [trimmedNoteId, user?.uid]);

  useEffect(() => {
    if (!trimmedNoteId) {
      setLoading(false);
      setError(null);
      setFlashcards([]);
      setSelectedFlashcards([]);
      return;
    }

    if (!user?.uid) {
      setLoading(authLoading);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadingMessage("Loading simulation...");
      setError(null);
      try {
        let cards = (await loadFlashcards({ skipLoadingOverlay: true })) ?? [];
        if (cards.length === 0 && !attemptedAutoGenerateRef.current) {
          attemptedAutoGenerateRef.current = true;
          setLoadingMessage("Generating flashcards...");
          await handleGenerateFlashcards({ skipSwitchToFlashcardMode: true });
          cards = (await loadFlashcards({ skipLoadingOverlay: true })) ?? [];
          setLoadingMessage("Loading simulation...");
        }

        const cardsWithStats = await attachStats(cards, user.uid);
        const candidatePool = buildSimulationPool(cardsWithStats);
        const candidateOriginal = candidatePool.map(stripConfidence);
        const selectedWithStats = selectFlashcardsForChallengeSession(
          candidatePool,
          candidateOriginal,
        );
        let selected = selectedWithStats.map(stripConfidence).slice(0, 8);

        if (selected.length < 5) {
          const selectedIds = new Set(
            selected.map((c) => c.id?.trim()).filter((id): id is string => Boolean(id)),
          );
          const fallback = cards.filter((c) => {
            const id = c.id?.trim();
            return !id || !selectedIds.has(id);
          });
          selected = [...selected, ...fallback].slice(0, 8);
        }
        if (!cancelled) {
          setFlashcards(cards);
          setSelectedFlashcards(selected);
          setMessages([]);
          setInputValue("");
          setIsStartingSimulation(false);
          setIsEvaluating(false);
          setDifficulty("medium");
          setScenarioType("intervention");
          setGeneratedScenario("");
          setFinalAnswer("");
          setIsSubmitted(false);
          setAnswerResult(null);
          setProcessResult(null);
          setCoverageResult(null);
          setFeedback("");
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load flashcards");
          setSelectedFlashcards([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    trimmedNoteId,
    user?.uid,
    authLoading,
    loadFlashcards,
    handleGenerateFlashcards,
    buildSimulationPool,
  ]);

  useEffect(() => {
    if (selectedFlashcards.length === 0) return;
    if (messages.length > 0) return;
    if (startedSimulationRef.current) return;

    startedSimulationRef.current = true;
    const generation = simulationStartGenerationRef.current;
    setIsStartingSimulation(true);

    void generateScenario(selectedFlashcards, scenarioType)
      .then((scenario) => {
        if (generation !== simulationStartGenerationRef.current) return null;
        const resolvedScenario =
          scenario ||
          "I have been dealing with something difficult recently and I am not sure what to make of it.";
        setGeneratedScenario(resolvedScenario);
        return startSimulation(
          selectedFlashcards,
          difficulty,
          scenarioType,
          resolvedScenario,
        );
      })
      .then((message) => {
        if (generation !== simulationStartGenerationRef.current) return;
        if (!message) return;
        setMessages([{ role: "ai", content: message }]);
      })
      .catch(() => {
        if (generation !== simulationStartGenerationRef.current) return;
        setMessages([
          {
            role: "ai",
            content: "I couldn't start the simulation right now. Please try again.",
          },
        ]);
      })
      .finally(() => {
        if (generation !== simulationStartGenerationRef.current) return;
        setIsStartingSimulation(false);
      });
  }, [selectedFlashcards, messages.length, difficulty, scenarioType]);

  if (!trimmedNoteId) {
    return (
      <div
        style={{
          maxWidth: "640px",
          margin: "40px auto",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
          padding: "24px",
        }}
      >
        <p style={{ color: "#374151", margin: 0 }}>Invalid simulation: missing note</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "640px",
          margin: "40px auto",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
          padding: "24px",
        }}
      >
        <p style={{ color: "#374151", margin: 0 }}>{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          maxWidth: "640px",
          margin: "40px auto",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
          padding: "24px",
        }}
      >
        <p style={{ color: "#374151", margin: 0 }}>Failed to load flashcards</p>
      </div>
    );
  }

  if (flashcards.length < 5) {
    return (
      <div
        style={{
          maxWidth: "640px",
          margin: "40px auto",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
          padding: "24px",
        }}
      >
        <p style={{ color: "#374151", margin: 0 }}>
          Not enough flashcards to run simulation
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "40px auto",
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
        padding: "24px",
      }}
    >
      {onBackToStudyModes ? (
        <button
          type="button"
          onClick={onBackToStudyModes}
          style={{
            border: "none",
            background: "transparent",
            color: "#2563eb",
            padding: 0,
            marginBottom: "12px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          ← Back to study modes
        </button>
      ) : null}

      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
        Simulation Mode
      </h1>

      <div
        style={{
          marginTop: "8px",
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          borderRadius: "10px",
          padding: "12px",
        }}
      >
        <p style={{ color: "#111827", margin: 0 }}>
          <strong>Role:</strong> {roleInferLoading ? "..." : inferredRole}
        </p>
        <p style={{ color: "#111827", marginTop: "8px", marginBottom: 0 }}>
          <strong>Goal:</strong> {simulationGoal}
        </p>
        <div style={{ marginTop: "10px" }}>
          <label
            htmlFor="scenario-type"
            style={{ color: "#111827", fontSize: "14px", fontWeight: 600 }}
          >
            Scenario Type
          </label>
          <select
            id="scenario-type"
            value={scenarioType}
            onChange={(e) => {
              const next = e.target.value as SimulationScenarioType;
              setScenarioType(next);
              if (isSubmitted || messages.some((m) => m.role === "user")) {
                return;
              }
              simulationStartGenerationRef.current += 1;
              startedSimulationRef.current = false;
              setMessages([]);
              setGeneratedScenario("");
            }}
            disabled={isSubmitted || hasUserMessage}
            style={{
              marginTop: "6px",
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "8px 10px",
              background: "#fff",
              color: "#111827",
            }}
          >
            <option value="diagnosis">Diagnosis</option>
            <option value="intervention">Intervention</option>
            <option value="explanation">Explanation</option>
          </select>
        </div>
      </div>

      <div
        style={{
          marginTop: "12px",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setIsReferenceNotesOpen((prev) => !prev)}
          style={{
            width: "100%",
            textAlign: "left",
            border: "none",
            background: "#f9fafb",
            color: "#111827",
            padding: "10px 12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isReferenceNotesOpen ? "▼ Reference Notes" : "▶ Reference Notes"}
        </button>
        {isReferenceNotesOpen ? (
          <div
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              background: "#ffffff",
              color: "#374151",
              padding: "12px",
              borderTop: "1px solid #e5e7eb",
              whiteSpace: "pre-wrap",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {formattedReferenceNotes
              ? formattedReferenceNotes
              : "No reference notes available."}
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {isStartingSimulation && messages.length === 0 ? (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#f3f4f6",
              color: "#111827",
              borderRadius: "12px",
              padding: "10px 12px",
              maxWidth: "90%",
              whiteSpace: "pre-wrap",
            }}
          >
            Starting simulation...
          </div>
        ) : null}
        {messages.map((message, idx) => (
          <div
            key={`${message.role}-${idx}`}
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              background: message.role === "user" ? "#dbeafe" : "#f3f4f6",
              color: "#111827",
              borderRadius: "12px",
              padding: "10px 12px",
              maxWidth: "90%",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.content}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your response..."
          disabled={isSubmitted}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            padding: "10px 12px",
            fontSize: "14px",
            minHeight: "80px",
            maxHeight: "200px",
            resize: "vertical",
            overflowY: "auto",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={isSending || isSubmitted || isStartingSimulation}
            onClick={async () => {
              const trimmed = inputValue.trim();
              if (!trimmed || isSending || isSubmitted || isStartingSimulation) return;

              const userMessage: SimulationMessage = {
                role: "user",
                content: trimmed,
              };
              const updatedMessages = [...messages, userMessage];
              setMessages(updatedMessages);
              setInputValue("");
              setIsSending(true);

              try {
                const aiReply = await nextSimulationStep(
                  selectedFlashcards,
                  updatedMessages,
                  difficulty,
                  scenarioType,
                  generatedScenario,
                );
                if (aiReply) {
                  setMessages((prev) => [
                    ...prev,
                    { role: "ai", content: aiReply },
                  ]);
                }
              } catch {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "ai",
                    content: "I couldn't respond right now. Please try again.",
                  },
                ]);
              } finally {
                setIsSending(false);
              }
            }}
            style={{
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: "10px",
              padding: "10px 14px",
              fontWeight: 600,
              cursor: isSending ? "not-allowed" : "pointer",
              opacity: isSending ? 0.7 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <textarea
          value={finalAnswer}
          onChange={(e) => setFinalAnswer(e.target.value)}
          placeholder="Enter your final answer..."
          disabled={isSubmitted}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            padding: "10px 12px",
            fontSize: "14px",
            minHeight: "100px",
            maxHeight: "220px",
            resize: "vertical",
            overflowY: "auto",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={isSubmitted || !finalAnswer.trim() || isEvaluating}
            onClick={async () => {
              if (!finalAnswer.trim() || isSubmitted || isEvaluating) return;
              const submitted = finalAnswer.trim();
              const correctAnswer = selectedFlashcards[0]?.answer ?? "";
              const supportingFacts = selectedFlashcards
                .slice(1)
                .map((c) => c.answer?.trim() ?? "")
                .filter(Boolean);

              setIsEvaluating(true);

              let evaluation: {
                answer: "correct" | "partial" | "incorrect";
                process: "good" | "average" | "poor";
                coverage: "high" | "medium" | "low";
                feedback: string;
              } = {
                answer: "incorrect",
                process: "poor",
                coverage: "low",
                feedback: "Could not evaluate performance. Please try again.",
              };
              try {
                evaluation = await evaluateSimulation(
                  submitted,
                  correctAnswer,
                  supportingFacts,
                  messages,
                );
              } catch {
                // Keep fallback evaluation set above.
              }

              setFinalAnswer(submitted);
              setAnswerResult(evaluation.answer);
              setProcessResult(evaluation.process);
              setCoverageResult(evaluation.coverage);
              setFeedback(evaluation.feedback);
              setIsSubmitted(true);
              setIsEvaluating(false);

              if (
                evaluation.answer === "correct" &&
                evaluation.process === "good" &&
                evaluation.coverage === "high"
              ) {
                setDifficulty("hard");
              } else if (
                evaluation.answer === "incorrect" ||
                evaluation.process === "poor"
              ) {
                setDifficulty("easy");
              } else {
                setDifficulty("medium");
              }

              if (user?.uid) {
                const [coreCard, ...supportingCards] = selectedFlashcards;
                const answer = evaluation.answer;
                const process = evaluation.process;
                const coverage = evaluation.coverage;

                let coreMode: "study" | "challenge" = "challenge";
                let coreIsCorrect = false;
                let supportingMode: "study" | "challenge" = "challenge";
                let supportingIsCorrect = false;

                // CASE A: incorrect + poor process => strong negative.
                if (answer === "incorrect" && process === "poor") {
                  coreMode = "study";
                  coreIsCorrect = false;
                  supportingMode = "challenge";
                  supportingIsCorrect = false;
                // CASE B: correct + poor process => guessed; weak core positive, supporting negative.
                } else if (answer === "correct" && process === "poor") {
                  coreMode = "challenge";
                  coreIsCorrect = true;
                  supportingMode = "challenge";
                  supportingIsCorrect = false;
                // CASE C: partial + good process => moderate positive.
                } else if (answer === "partial" && process === "good") {
                  coreMode = "challenge";
                  coreIsCorrect = true;
                  supportingMode = "challenge";
                  supportingIsCorrect = true;
                // CASE D: correct + good process + high coverage => strong positive.
                } else if (
                  answer === "correct" &&
                  process === "good" &&
                  coverage === "high"
                ) {
                  coreMode = "study";
                  coreIsCorrect = true;
                  supportingMode = "challenge";
                  supportingIsCorrect = true;
                } else if (answer === "correct") {
                  coreMode = "challenge";
                  coreIsCorrect = true;
                  supportingMode = "challenge";
                  supportingIsCorrect = coverage !== "low";
                } else if (answer === "partial") {
                  coreMode = "challenge";
                  coreIsCorrect = true;
                  supportingMode = "challenge";
                  supportingIsCorrect = false;
                } else {
                  coreMode = "challenge";
                  coreIsCorrect = false;
                  supportingMode = "challenge";
                  supportingIsCorrect = false;
                }

                if (coreCard?.id?.trim()) {
                  void updateFlashcardStats({
                    userId: user.uid,
                    flashcardId: coreCard.id,
                    isCorrect: coreIsCorrect,
                    mode: coreMode,
                    debugContext: "SimulationMode|Core|submit|user_flashcard_stats",
                  });
                }

                for (const card of supportingCards) {
                  const flashcardId = card.id?.trim();
                  if (!flashcardId) continue;
                  void updateFlashcardStats({
                    userId: user.uid,
                    flashcardId,
                    isCorrect: supportingIsCorrect,
                    mode: supportingMode,
                    debugContext: "SimulationMode|Support|submit|user_flashcard_stats",
                  });
                }
              }
            }}
            style={{
              border: "1px solid #059669",
              background: "#059669",
              color: "#ffffff",
              borderRadius: "10px",
              padding: "10px 14px",
              fontWeight: 600,
              cursor: isSubmitted ? "not-allowed" : "pointer",
              opacity: isSubmitted || !finalAnswer.trim() || isEvaluating ? 0.7 : 1,
            }}
          >
            {isEvaluating ? "Evaluating..." : "Submit Answer"}
          </button>
        </div>
      </div>

      {isSubmitted ? (
        <div
          style={{
            marginTop: "12px",
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            borderRadius: "10px",
            padding: "12px",
          }}
        >
          <p style={{ margin: 0, color: "#111827" }}>Your Answer: {finalAnswer}</p>
          <p style={{ marginTop: "8px", marginBottom: 0, color: "#111827" }}>
            Correct Answer: {selectedFlashcards[0]?.answer ?? ""}
          </p>
          <p style={{ marginTop: "8px", marginBottom: 0, color: "#4b5563" }}>
            {answerResult === "correct"
              ? "✅ Correct"
              : answerResult === "partial"
                ? "⚠️ Partially correct"
                : "❌ Incorrect"}
          </p>
          <p style={{ marginTop: "8px", marginBottom: 0, color: "#4b5563" }}>
            Process:{" "}
            {processResult === "good"
              ? "Good"
              : processResult === "average"
                ? "Average"
                : "Poor"}
          </p>
          <p style={{ marginTop: "8px", marginBottom: 0, color: "#4b5563" }}>
            Coverage:{" "}
            {coverageResult === "high"
              ? "High"
              : coverageResult === "medium"
                ? "Medium"
                : "Low"}
          </p>
          <p style={{ marginTop: "8px", marginBottom: 0, color: "#4b5563" }}>
            Feedback: {feedback}
          </p>
        </div>
      ) : null}
    </div>
  );
}
