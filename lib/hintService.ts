import { generateHints } from "@/lib/hintGenerator";
import { getHintCacheKey } from "@/lib/hintCache";

type HintResponse = {
  hints?: unknown;
};

type CachedAiHints = {
  hints: string[];
  source: "ai";
};

function sanitizeHints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function hasVerbLikeWord(s: string): boolean {
  const lowered = s.toLowerCase();
  if (/\b(is|are|was|were|be|being|been|has|have|had|does|do|did|can|could|will|would|should|may|might|must)\b/.test(lowered)) {
    return true;
  }
  return /\b[a-z]{3,}(ed|ing)\b/.test(lowered);
}

function tooSimilar(a: string, b: string): boolean {
  const aSet = new Set(a.toLowerCase().split(/\W+/).filter((x) => x.length > 2));
  const bSet = new Set(b.toLowerCase().split(/\W+/).filter((x) => x.length > 2));
  if (aSet.size === 0 || bSet.size === 0) return false;
  let inter = 0;
  for (const w of aSet) {
    if (bSet.has(w)) inter += 1;
  }
  const union = new Set([...aSet, ...bSet]).size;
  return union > 0 ? inter / union >= 0.8 : false;
}

function isValidHints(hints: string[]): boolean {
  if (!Array.isArray(hints) || hints.length !== 4) return false;
  const banned = ["focus on", "think about", "consider"];
  for (const hint of hints) {
    const h = hint.trim();
    if (wordCount(h) < 8) return false;
    if (banned.some((b) => h.toLowerCase().includes(b))) return false;
    if (!hasVerbLikeWord(h)) return false;
  }
  for (let i = 0; i < hints.length; i += 1) {
    for (let j = i + 1; j < hints.length; j += 1) {
      if (tooSimilar(hints[i]!, hints[j]!)) return false;
    }
  }
  return true;
}

function fallbackHints(question: string, answer: string): string[] {
  const base = generateHints(question, answer);
  return base.length === 4
    ? base
    : [
        `This is related to ${answer.slice(0, 20)}...`,
        "Focus on the main idea of the question",
        "Eliminate incorrect options",
        answer,
      ];
}

function readCachedAiHints(key: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedAiHints>;
    if (parsed.source !== "ai") return null;
    const hints = sanitizeHints(parsed.hints);
    if (!isValidHints(hints)) return null;
    return hints;
  } catch {
    return null;
  }
}

function writeCachedAiHints(key: string, hints: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedAiHints = { hints, source: "ai" };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore localStorage failures.
  }
}

async function callHintsApi(
  question: string,
  correctAnswer: string,
  distractors: string[] = [],
): Promise<string[] | null> {
  const res = await fetch("/api/generate-hints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, correctAnswer, distractors }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as HintResponse;
  const hints = sanitizeHints(data.hints);
  return isValidHints(hints) ? hints : null;
}

export async function getHints(
  question: string,
  answer: string,
  distractors: string[] = [],
): Promise<string[]> {
  const key = getHintCacheKey(question, answer);
  const cached = readCachedAiHints(key);
  if (cached) {
    console.debug("Using cached AI hints");
    return cached;
  }

  console.debug("Calling AI for hints");
  try {
    const first = await callHintsApi(question, answer, distractors);
    if (first) {
      writeCachedAiHints(key, first);
      return first;
    }

    console.debug("Retrying AI generation");
    const second = await callHintsApi(question, answer, distractors);
    if (second) {
      writeCachedAiHints(key, second);
      return second;
    }
  } catch {
    console.debug("Retrying AI generation");
    try {
      const second = await callHintsApi(question, answer, distractors);
      if (second) {
        writeCachedAiHints(key, second);
        return second;
      }
    } catch {
      // Fall through to fallback.
    }
  }

  console.debug("Using fallback hints (not cached)");
  return fallbackHints(question, answer);
}

