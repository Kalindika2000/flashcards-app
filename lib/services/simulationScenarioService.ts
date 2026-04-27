import type { Flashcard } from "@/features/study/types/flashcard";
import { parseJsonResponse } from "@/lib/api/readJsonResponse";
import type { SimulationScenarioType } from "@/lib/services/simulationService";

type SimulationScenarioApiResponse = {
  scenario?: unknown;
};

export async function generateScenario(
  flashcards: Flashcard[],
  scenarioType: SimulationScenarioType,
): Promise<string> {
  const response = await fetch("/api/simulation-generate-scenario", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ flashcards, scenarioType }),
  });

  const result = await parseJsonResponse<SimulationScenarioApiResponse>(response);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const raw = result.data.scenario;
  return typeof raw === "string" ? raw.trim() : "";
}
