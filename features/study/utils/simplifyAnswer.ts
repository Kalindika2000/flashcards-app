/**
 * Shortens verbose flashcard answers for multiple-choice display only.
 * Does not mutate stored data — call at render time.
 */

const PREFIXES_LONGEST_FIRST = [
  "The current ",
  "Employers must ",
  "The contribution rate ",
  "The superannuation ",
  "The money ",
  "Compulsory superannuation contribution rate ",
  "The ",
];

/** Known rewrites — run before broad filler removal so phrases stay matchable. */
const KNOWN_PATTERNS: [RegExp, string][] = [
  [
    /is\s+11\.5%\s+of\s+an\s+employee'?s\s+earnings/gi,
    "11.5% of earnings",
  ],
  [
    /will\s+increase\s+to\s+12%\s+on\s+1\s+July\s+2025/gi,
    "12% (from July 2025)",
  ],
  [
    /is\s+taxed\s+at\s+a\s+concessional\s+rate\s+of\s+15%/gi,
    "15% tax rate",
  ],
];

const FILLER_PHRASES = [
  "of an employee's earnings",
  "of an employees earnings",
  "into a super fund",
  "can be",
];

export function simplifyAnswer(answer: string): string {
  const original = answer.trim();
  if (!original) return answer;

  let s = original;

  // A. Strip leading prefixes (longest first; repeat while a prefix matches)
  let prefixPass = true;
  while (prefixPass) {
    prefixPass = false;
    const lower = s.toLowerCase();
    for (const p of PREFIXES_LONGEST_FIRST) {
      const pl = p.toLowerCase();
      if (lower.startsWith(pl)) {
        s = s.slice(p.length).trim();
        prefixPass = true;
        break;
      }
    }
  }

  // C. Known short patterns (before removing small words that appear inside them)
  for (const [re, rep] of KNOWN_PATTERNS) {
    s = s.replace(re, rep);
  }

  // B. Filler phrases (substring, case-insensitive)
  for (const phrase of FILLER_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    s = s.replace(re, " ");
  }

  // B. Small filler words (word-boundary)
  s = s.replace(/\bcan be\b/gi, " ");
  s = s.replace(/\bmust\b/gi, " ");
  s = s.replace(/\bwill\b/gi, " ");
  s = s.replace(/\bare\b/gi, " ");
  s = s.replace(/\bis\b/gi, " ");

  // D. Whitespace and stray punctuation at ends
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^[.,;:\s]+|[.,;:\s]+$/g, "");

  const words = s.split(/\s+/).filter(Boolean);
  const origWords = original.split(/\s+/).filter(Boolean);

  if (!s || words.length === 0) {
    return original;
  }

  if (s.length < 8 && original.length > 20) {
    return original;
  }

  if (words.length < 2 && origWords.length > 5) {
    return original;
  }

  return s;
}
