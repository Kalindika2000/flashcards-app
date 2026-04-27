import { parseJsonResponse } from "@/lib/api/readJsonResponse";
import type { Flashcard } from "@/features/study/types/flashcard";

type SimulationApiResponse = {
  message?: unknown;
};

export type SimulationMessage = {
  role: "user" | "ai";
  content: string;
};

export type SimulationDifficulty = "easy" | "medium" | "hard";
export type SimulationScenarioType = "diagnosis" | "intervention" | "explanation";

export async function startSimulation(
  flashcards: Flashcard[],
  difficulty: SimulationDifficulty,
  scenarioType: SimulationScenarioType,
  scenario: string,
): Promise<string> {
  const response = await fetch("/api/simulation-start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ flashcards, difficulty, scenarioType, scenario }),
  });

  const result = await parseJsonResponse<SimulationApiResponse>(response);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const raw = result.data.message;
  return typeof raw === "string" ? raw.trim() : "";
}

export async function nextSimulationStep(
  flashcards: Flashcard[],
  messages: SimulationMessage[],
  difficulty: SimulationDifficulty,
  scenarioType: SimulationScenarioType,
  scenario: string,
): Promise<string> {
  const response = await fetch("/api/simulation-step", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ flashcards, messages, difficulty, scenarioType, scenario }),
  });

  const result = await parseJsonResponse<SimulationApiResponse>(response);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const raw = result.data.message;
  return typeof raw === "string" ? raw.trim() : "";
}
