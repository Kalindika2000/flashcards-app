import type { McqDifficulty } from "@/features/study/utils/mcqDifficulty";

export function parseMcqDifficulty(
  raw: unknown,
): McqDifficulty | undefined {
  if (raw === "easy" || raw === "medium" || raw === "hard") return raw;
  return undefined;
}

/** Extra rules appended to misconception generation (Step 1). */
export function misconceptionDifficultyRulesForPrompt(
  difficulty: McqDifficulty | undefined,
): string {
  if (difficulty === "easy") {
    return `

Difficulty level: EASY (distractors should be easier to rule out)
* Generate misconceptions that are clearly different from the correct answer
* Use distinct concepts, roles, or outcomes — avoid wording that mirrors the correct answer
* Do not use phrasing that is only a small tweak of the correct answer`;
  }
  if (difficulty === "hard") {
    return `

Difficulty level: HARD (distractors should be very plausible)
* Generate misconceptions that are VERY close to the correct answer
* Change only one key detail (e.g. condition, threshold, subject, or scope) per misconception
* Keep sentence structure and length broadly similar to the correct answer where natural`;
  }
  return `

Difficulty level: MEDIUM (balanced plausibility)
* Mix noticeably wrong ideas with a few subtler confusions
* Avoid all misconceptions sounding identical in structure`;
}
