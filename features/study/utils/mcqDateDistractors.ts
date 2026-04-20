import type { McqDifficulty } from "@/features/study/utils/mcqDifficulty";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type ParsedAnswerDate = {
  day: number;
  month: number;
  year: number;
  /** Rebuild the same visual pattern as the source answer. */
  format: (day: number, month: number, year: number) => string;
};

/** Uniform MCQ display: "1 July 2025" */
export function formatDateCanonical(day: number, month: number, year: number): string {
  const name = MONTH_NAMES[month - 1];
  if (!name) return `${day}/${month}/${year}`;
  return `${day} ${name} ${year}`;
}

function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Parse common date shapes from a flashcard answer. Returns null if unsupported.
 */
export function parseAnswerDate(answer: string): ParsedAnswerDate | null {
  const t = answer.trim();
  if (!t) return null;

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = parseInt(iso[1]!, 10);
    const month = parseInt(iso[2]!, 10);
    const day = parseInt(iso[3]!, 10);
    if (!isValidCalendarDate(day, month, year)) return null;
    return {
      day,
      month,
      year,
      format(d, m, y) {
        const mm = String(m).padStart(2, "0");
        const dd = String(d).padStart(2, "0");
        return `${y}-${mm}-${dd}`;
      },
    };
  }

  const dMonthY = t.match(
    /^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i,
  );
  if (dMonthY) {
    const day = parseInt(dMonthY[1]!, 10);
    const monthName = dMonthY[2]!;
    const year = parseInt(dMonthY[3]!, 10);
    const month = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthName.toLowerCase()) + 1;
    if (month < 1 || !isValidCalendarDate(day, month, year)) return null;
    return {
      day,
      month,
      year,
      format(d, m, y) {
        const name = MONTH_NAMES[m - 1]!;
        return `${d} ${name} ${y}`;
      },
    };
  }

  const monthDY = t.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})$/i,
  );
  if (monthDY) {
    const monthName = monthDY[1]!;
    const day = parseInt(monthDY[2]!, 10);
    const year = parseInt(monthDY[3]!, 10);
    const month = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthName.toLowerCase()) + 1;
    if (month < 1 || !isValidCalendarDate(day, month, year)) return null;
    return {
      day,
      month,
      year,
      format(d, m, y) {
        const name = MONTH_NAMES[m - 1]!;
        return `${name} ${d}, ${y}`;
      },
    };
  }

  return null;
}

function clampDay(day: number, month: number, year: number): number {
  if (isValidCalendarDate(day, month, year)) return day;
  for (let d = day - 1; d >= 1; d--) {
    if (isValidCalendarDate(d, month, year)) return d;
  }
  return 1;
}

function formatSafe(
  parsed: ParsedAnswerDate,
  day: number,
  month: number,
  year: number,
): string | null {
  const d = clampDay(day, month, year);
  if (!isValidCalendarDate(d, month, year)) return null;
  return parsed.format(d, month, year);
}

/**
 * Date distractors: closeness depends on difficulty (year/month shifts).
 */
export function generateDateDistractorStrings(
  parsed: ParsedAnswerDate,
  correctRaw: string,
  difficulty: McqDifficulty = "medium",
): string[] | null {
  const c = correctRaw.trim();
  const { day, month, year } = parsed;
  const candidates: string[] = [];

  if (difficulty === "easy") {
    const y1 = formatSafe(parsed, day, month, year + 8);
    const y2 = formatSafe(parsed, day, month, year - 7);
    const y3 = formatSafe(parsed, day, month, year + 10);
    if (y1) candidates.push(y1);
    if (y2) candidates.push(y2);
    if (y3) candidates.push(y3);
  } else if (difficulty === "hard") {
    let nearA: string | null;
    let nearB: string | null;
    if (month >= 2 && month <= 11) {
      nearA = formatSafe(parsed, day, month - 1, year);
      nearB = formatSafe(parsed, day, month + 1, year);
    } else if (month === 1) {
      nearA = formatSafe(parsed, day, 2, year);
      nearB = formatSafe(parsed, day, 3, year);
    } else {
      nearA = formatSafe(parsed, day, 11, year);
      nearB = formatSafe(parsed, day, 10, year);
    }
    const yearBump = formatSafe(parsed, day, month, year + 1);
    if (nearA) candidates.push(nearA);
    if (nearB) candidates.push(nearB);
    if (yearBump) candidates.push(yearBump);
  } else {
    const yA = formatSafe(parsed, day, month, year + 2);
    const yB = formatSafe(parsed, day, month, year - 3);
    const yC = formatSafe(parsed, day, month, year + 3);
    if (yA) candidates.push(yA);
    if (yB) candidates.push(yB);
    if (yC) candidates.push(yC);
    if (candidates.length < 3) {
      let nearA: string | null;
      let nearB: string | null;
      if (month >= 2 && month <= 11) {
        nearA = formatSafe(parsed, day, month - 1, year);
        nearB = formatSafe(parsed, day, month + 1, year);
      } else if (month === 1) {
        nearA = formatSafe(parsed, day, 2, year);
        nearB = formatSafe(parsed, day, 3, year);
      } else {
        nearA = formatSafe(parsed, day, 11, year);
        nearB = formatSafe(parsed, day, 10, year);
      }
      if (nearA) candidates.push(nearA);
      if (nearB) candidates.push(nearB);
    }
  }

  const pool = uniqueStrings(candidates).filter((s) => s !== c);
  if (pool.length < 3) return null;
  return pool.slice(0, 3);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = v.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}
