import { parseJsonResponse } from "@/lib/api/readJsonResponse";

type DistractorsApiResponse = {
  distractors?: unknown;
  error?: string;
};

export type GenerateAIDistractorsOptions = {
  /** Stronger prompt for definition-style questions: short, plausible wrong terms. */
  questionKind?: "definition";
};

/**
 * Server-backed OpenAI distractors (0–3 strings). Empty if the request fails.
 */
export async function generateAIDistractors(
  question: string,
  correctAnswer: string,
  options?: GenerateAIDistractorsOptions,
): Promise<string[]> {
  try {
    const response = await fetch("/api/generate-distractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        correctAnswer,
        ...(options?.questionKind ? { questionKind: options.questionKind } : {}),
      }),
    });

    const result = await parseJsonResponse<DistractorsApiResponse>(response);
    if (!result.ok) return [];

    const raw = result.data.distractors;
    if (!Array.isArray(raw)) return [];

    const correct = correctAnswer.trim();
    return raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s && s !== correct)
      .slice(0, 3);
  } catch {
    return [];
  }
}
