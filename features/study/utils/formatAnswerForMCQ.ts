import { parseFormattedMcqResponse } from "@/features/study/utils/mcqFormatParse";
import { simplifyAnswer } from "@/features/study/utils/simplifyAnswer";
import { tryFormatAnswer } from "@/features/study/utils/tryFormatAnswer";

/** In-memory cache: one formatted label per (flashcard, raw option text). */
export const answerCache = new Map<string, string>();

const inflight = new Map<string, Promise<string>>();

function cacheKey(flashcardId: string, answer: string): string {
  return `${flashcardId}\0${answer}`;
}

async function fetchAiFormattedAnswer(answer: string): Promise<string> {
  const res = await fetch("/api/format-mcq-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });

  const data = (await res.json()) as { formatted?: string };
  const raw = typeof data.formatted === "string" ? data.formatted : "";
  const fb = simplifyAnswer(answer).trim() || answer.trim();
  return parseFormattedMcqResponse(raw, fb);
}

/**
 * Hybrid: rule-based first (see tryFormatAnswer), then OpenAI with in-memory cache.
 * Scoring must keep using the raw `answer` string — this is display-only.
 */
export async function formatAnswerForMCQ(
  answer: string,
  flashcardId: string,
): Promise<string> {
  const key = cacheKey(flashcardId, answer);

  const hit = answerCache.get(key);
  if (hit !== undefined) {
    return hit;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  const run = async (): Promise<string> => {
    const fast = tryFormatAnswer(answer);
    if (fast !== null) {
      answerCache.set(key, fast);
      return fast;
    }

    let out: string;
    try {
      out = await fetchAiFormattedAnswer(answer);
      if (!out.trim()) {
        out = answer.trim();
      }
    } catch {
      out = simplifyAnswer(answer).trim() || answer.trim();
    }

    answerCache.set(key, out);
    return out;
  };

  const p = run();
  inflight.set(key, p);
  p.catch(() => {}).finally(() => {
    inflight.delete(key);
  });

  return p;
}
