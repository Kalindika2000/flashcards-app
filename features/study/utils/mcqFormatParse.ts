/** Normalize model output: trim, strip wrapping quotes, enforce max 8 words. */
export function parseFormattedMcqResponse(raw: string, fallback: string): string {
  let s = raw.trim();
  s = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  s = s.replace(/\s+/g, " ").trim();
  const words = s.split(/\s+/).filter(Boolean);
  if (!s || words.length === 0 || words.length > 8) {
    return fallback;
  }
  return s;
}
