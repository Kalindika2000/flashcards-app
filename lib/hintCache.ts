const HINT_CACHE_PREFIX = "hint-cache-v1";

function hashText(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function getHintCacheKey(question: string, answer: string): string {
  const normalized = `${question.trim().toLowerCase()}::${answer.trim().toLowerCase()}`;
  return `${HINT_CACHE_PREFIX}:${hashText(normalized)}`;
}

export function getCachedHints(key: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const hints = parsed
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .slice(0, 4);
    return hints.length === 4 ? hints : null;
  } catch {
    return null;
  }
}

export function setCachedHints(key: string, hints: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const value = hints
      .map((h) => h.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (value.length !== 4) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore cache write failures (quota/private mode/etc.)
  }
}

