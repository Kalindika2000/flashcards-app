/**
 * Two-step definition MCQ: misconceptions → select best 3 distractors.
 * Paired with /api/generate-misconceptions, /api/generate-misconceptions-batch,
 * and /api/select-definition-distractors.
 */

import type { McqDifficulty } from "@/features/study/utils/mcqDifficulty";

function extractJsonArray(raw: string): unknown {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]!);
  } catch {
    return null;
  }
}

function extractJsonObject(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]!);
  } catch {
    return null;
  }
}

function parseStringArray(parsed: unknown): string[] {
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/** Dedupe and drop strings equal to the correct answer (Step 1 / batch). */
export function sanitizeMisconceptionsList(
  candidates: string[],
  correctAnswer: string,
): string[] {
  const correctLc = correctAnswer.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of candidates) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (!s || s.toLowerCase() === correctLc) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/** Parse Step 1 output: 6–8 misconceptions, excluding the correct answer. */
export function parseMisconceptionsResponse(
  raw: string,
  correctAnswer: string,
): string[] {
  const parsed = extractJsonArray(raw);
  const arr = parseStringArray(parsed ?? []);
  return sanitizeMisconceptionsList(arr, correctAnswer);
}

/** Parse Step 2 output: exactly 3 distractors. */
export function parseThreeDistractorsResponse(
  raw: string,
  correctAnswer: string,
): string[] {
  const correctLc = correctAnswer.trim().toLowerCase();
  const parsed = extractJsonArray(raw);
  if (!Array.isArray(parsed)) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (!s || s.toLowerCase() === correctLc) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length === 3) break;
  }
  if (out.length !== 3) return [];
  return out;
}

async function fetchContent(url: string, body: Record<string, unknown>): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as { content?: string };
  return typeof data.content === "string" ? data.content : "";
}

export type MisconceptionBatchItem = {
  flashcardId: string;
  question: string;
  answer: string;
  /** Challenge difficulty for Step 1 prompt shaping. */
  difficulty?: McqDifficulty;
};

function parseBatchMisconceptionsResponse(
  raw: string,
  items: MisconceptionBatchItem[],
): Record<string, string[]> {
  const parsed = extractJsonObject(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const out: Record<string, string[]> = {};
  const obj = parsed as Record<string, unknown>;

  for (const item of items) {
    const v = obj[item.flashcardId];
    if (!Array.isArray(v)) continue;
    const strings: string[] = [];
    for (const el of v) {
      if (typeof el === "string") strings.push(el);
    }
    let sanitized = sanitizeMisconceptionsList(strings, item.answer);
    if (sanitized.length > 8) {
      sanitized = sanitized.slice(0, 8);
    }
    if (sanitized.length >= 6 && sanitized.length <= 8) {
      out[item.flashcardId] = sanitized;
    }
  }

  return out;
}

/**
 * Step 1 (batch): misconceptions for multiple definition flashcards in one OpenAI call.
 * Returns only entries that parsed with 6–8 misconceptions each (caller may fall back per id).
 */
export async function generateMisconceptionsBatch(
  items: MisconceptionBatchItem[],
): Promise<Record<string, string[]>> {
  if (items.length === 0) return {};

  const content = await fetchContent("/api/generate-misconceptions-batch", {
    items,
  });
  return parseBatchMisconceptionsResponse(content, items);
}

/**
 * Step 1: list common misconceptions (6–8 strings).
 */
export async function generateMisconceptions(
  question: string,
  correctAnswer: string,
  difficulty: McqDifficulty = "medium",
): Promise<string[]> {
  const content = await fetchContent("/api/generate-misconceptions", {
    question,
    correctAnswer,
    difficulty,
  });
  return parseMisconceptionsResponse(content, correctAnswer);
}

/**
 * Step 2: pick the best 3 distractors from misconception candidates.
 */
export async function selectBestDistractors(
  misconceptions: string[],
  correctAnswer: string,
  useRetryPrompt = false,
): Promise<string[]> {
  if (misconceptions.length < 3) return [];
  const content = await fetchContent("/api/select-definition-distractors", {
    misconceptions,
    correctAnswer,
    useRetryPrompt,
  });
  return parseThreeDistractorsResponse(content, correctAnswer);
}
