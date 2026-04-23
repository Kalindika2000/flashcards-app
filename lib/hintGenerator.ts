const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "with",
  "this",
  "these",
  "those",
  "which",
  "what",
  "when",
  "where",
  "who",
  "why",
  "how",
  "does",
  "do",
  "did",
  "into",
  "than",
  "then",
  "their",
  "there",
  "about",
  "after",
  "before",
  "during",
  "through",
  "over",
  "under",
  "up",
  "down",
]);

export type AnswerType = "percentage" | "number" | "process" | "definition" | "general";

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

export function detectAnswerType(question: string, answer: string): AnswerType {
  const q = question.trim().toLowerCase();
  if (/%/.test(answer)) return "percentage";
  if (/\d/.test(answer)) return "number";
  if (q.startsWith("how")) return "process";
  if (q.startsWith("what is") || q.startsWith("define")) return "definition";
  return "general";
}

export function extractKeywords(answer: string): string[] {
  const words = normalizeWords(answer);
  const freq = new Map<string, number>();
  for (const w of words) {
    if (w.length < 3) continue;
    if (STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([w]) => w);
  if (ranked.length > 0) return ranked;
  return normalizeWords(answer).filter((w) => w.length >= 2).slice(0, 3);
}

export function extractSubject(answer: string): string {
  const keywords = extractKeywords(answer);
  return keywords[0] ?? "key concept";
}

export function extractKeyPhrases(answer: string): string[] {
  const chunks = answer
    .split(/,|\band\b/gi)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.replace(/[.?!;:]+$/g, ""));

  const phrases: string[] = [];
  for (const c of chunks) {
    if (phrases.length >= 3) break;
    const words = normalizeWords(c).filter((w) => !STOPWORDS.has(w));
    if (words.length === 0) continue;
    phrases.push(words.slice(0, 6).join(" "));
  }
  if (phrases.length > 0) return phrases;
  return extractKeywords(answer).slice(0, 3);
}

export function shortenAnswer(answer: string): string {
  const cleaned = answer.replace(/\s+/g, " ").trim().replace(/[.?!;:,]+$/g, "");
  if (!cleaned) return "key details in the answer";
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length <= 12) return cleaned;
  return `${words.slice(0, 12).join(" ")}…`;
}

function approximateRange(answer: string): string {
  const matches = answer.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return "a narrow expected range";
  const n = Number(matches[0]);
  if (!Number.isFinite(n)) return "a narrow expected range";
  if (n < 10) return `${Math.max(0, Math.floor(n - 2))}-${Math.ceil(n + 2)}`;
  if (n < 100) return `${Math.max(0, Math.floor(n - 10))}-${Math.ceil(n + 10)}`;
  return `${Math.max(0, Math.floor(n * 0.9))}-${Math.ceil(n * 1.1)}`;
}

function firstPercent(answer: string): string {
  const m = answer.match(/\d+(\.\d+)?\s*%/);
  return m?.[0] ?? answer;
}

export function generateHints(question: string, answer: string): string[] {
  const answerType = detectAnswerType(question, answer);
  const keywords = extractKeywords(answer);
  const subject = extractSubject(answer);
  const keyPhrases = extractKeyPhrases(answer);
  const shortened = shortenAnswer(answer);
  const p1 = keyPhrases[0] ?? subject;
  const p2 = keyPhrases[1] ?? (keywords[1] ?? subject);

  if (answerType === "percentage") {
    const pct = firstPercent(answer);
    return [
      `Think about a required percentage tied to ${subject}.`,
      `This is the minimum percentage applied to ${p1}.`,
      `It is a fixed percentage near the 10% range, specifically linked to ${p2}.`,
      `The required value is ${answer || pct}.`,
    ];
  }

  if (answerType === "number") {
    const range = approximateRange(answer);
    return [
      `Think about a specific numeric value connected to ${subject}.`,
      `This value is a fixed amount or threshold for ${p1}.`,
      `It is a number in the range of ${range}, tied to ${p2}.`,
      `${answer}`,
    ];
  }

  if (answerType === "process") {
    return [
      `Think about a process involving ${keywords[0] ?? subject}.`,
      `It involves ${p1} and ${p2}.`,
      `This process uses ${keyPhrases.join(", ")}.`,
      `${shortened}`,
    ];
  }

  if (answerType === "definition") {
    const k1 = keywords[0] ?? subject;
    const k2 = keywords[1] ?? (keyPhrases[1] ?? subject);
    return [
      `Think about ${k1} in this context.`,
      `It relates to ${k1} and ${k2}.`,
      `It involves ${keyPhrases.join(", ")}.`,
      `${shortened}`,
    ];
  }

  const g1 = keywords[0] ?? subject;
  const g2 = keywords[1] ?? (keyPhrases[1] ?? subject);
  return [
    `Focus on ${g1}.`,
    `It relates to ${g1} and ${g2}.`,
    `It involves ${keyPhrases.join(", ")}.`,
    `${shortened}`,
  ];
}

