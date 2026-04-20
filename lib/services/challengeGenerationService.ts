import type { Challenge } from "@/features/generation/types/challenge";
import { parseJsonResponse } from "@/lib/api/readJsonResponse";

type ChallengesApiResponse = {
  challenges?: unknown;
  error?: string;
};

export async function generateChallengesFromNotes(
  notes: string,
): Promise<Challenge[]> {
  const response = await fetch("/api/generate-challenges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });

  const result = await parseJsonResponse<ChallengesApiResponse>(response);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const raw = result.data.challenges;
  return Array.isArray(raw) ? (raw as Challenge[]) : [];
}
