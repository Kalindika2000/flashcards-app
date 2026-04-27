import { parseJsonResponse } from "@/lib/api/readJsonResponse";

export type SimulationEvaluationResult = "correct" | "partial" | "incorrect";
export type SimulationProcessResult = "good" | "average" | "poor";
export type SimulationCoverageResult = "high" | "medium" | "low";
export type SimulationEvaluationMessage = { role: "user" | "ai"; content: string };

type SimulationEvaluationApiResponse = {
  answer?: unknown;
  process?: unknown;
  coverage?: unknown;
  feedback?: unknown;
};

export async function evaluateSimulation(
  userAnswer: string,
  correctAnswer: string,
  supportingFacts: string[],
  messages: SimulationEvaluationMessage[],
): Promise<{
  answer: SimulationEvaluationResult;
  process: SimulationProcessResult;
  coverage: SimulationCoverageResult;
  feedback: string;
}> {
  const response = await fetch("/api/simulation-evaluate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userAnswer, correctAnswer, supportingFacts, messages }),
  });

  const result = await parseJsonResponse<SimulationEvaluationApiResponse>(response);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const rawAnswer = result.data.answer;
  const rawProcess = result.data.process;
  const rawCoverage = result.data.coverage;
  const rawFeedback = result.data.feedback;
  const normalizedAnswer: SimulationEvaluationResult =
    rawAnswer === "correct" || rawAnswer === "partial" || rawAnswer === "incorrect"
      ? rawAnswer
      : "incorrect";
  const normalizedProcess: SimulationProcessResult =
    rawProcess === "good" || rawProcess === "average" || rawProcess === "poor"
      ? rawProcess
      : "poor";
  const normalizedCoverage: SimulationCoverageResult =
    rawCoverage === "high" || rawCoverage === "medium" || rawCoverage === "low"
      ? rawCoverage
      : "low";
  const normalizedFeedback =
    typeof rawFeedback === "string" && rawFeedback.trim()
      ? rawFeedback.trim()
      : "Could not evaluate performance. Please try again.";

  return {
    answer: normalizedAnswer,
    process: normalizedProcess,
    coverage: normalizedCoverage,
    feedback: normalizedFeedback,
  };
}
