/**
 * Definition-style MCQ distractors: two-step AI (misconceptions → select best 3),
 * then validation, optional Step 2 retry, then rule-based fallback.
 * Caches only the final three distractors (key: question + correctAnswer).
 */

import { buildFallbackDefinitionDistractors } from "@/features/study/utils/definitionDistractorFallback";
import {
  generateMisconceptions,
  sanitizeMisconceptionsList,
  selectBestDistractors,
} from "@/features/study/utils/definitionTwoStepDistractors";
import { validateDefinitionDistractors } from "@/features/study/utils/validateDefinitionDistractors";
import type { McqDifficulty } from "@/features/study/utils/mcqDifficulty";

export const definitionCache = new Map<string, string[]>();

const inflight = new Map<string, Promise<string[]>>();

function cacheKey(
  question: string,
  correctAnswer: string,
  difficulty: McqDifficulty,
): string {
  return `${question.trim()}\0${correctAnswer.trim()}\0${difficulty}`;
}

function cacheAndReturn(key: string, value: string[]): string[] {
  definitionCache.set(key, value);
  return value;
}

/**
 * Returns exactly three incorrect options, or [] so callers can fall back to general MCQ pools.
 * @param precomputedMisconceptions — from batch prefetch (Challenge); if insufficient, falls back to single-item Step 1.
 */
export async function generateDefinitionDistractors(
  question: string,
  correctAnswer: string,
  precomputedMisconceptions?: string[],
  difficulty: McqDifficulty = "medium",
): Promise<string[]> {
  const key = cacheKey(question, correctAnswer, difficulty);

  const cached = definitionCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  const run = async (): Promise<string[]> => {
    try {
      let misconceptions: string[];
      if (precomputedMisconceptions && precomputedMisconceptions.length > 0) {
        misconceptions = sanitizeMisconceptionsList(
          precomputedMisconceptions,
          correctAnswer,
        );
        if (misconceptions.length < 3) {
          misconceptions = await generateMisconceptions(
            question,
            correctAnswer,
            difficulty,
          );
        }
      } else {
        misconceptions = await generateMisconceptions(
          question,
          correctAnswer,
          difficulty,
        );
      }
      if (misconceptions.length < 3) {
        const fb = buildFallbackDefinitionDistractors(correctAnswer);
        if (fb && fb.length === 3) {
          return cacheAndReturn(key, fb);
        }
        return [];
      }

      let distractors = await selectBestDistractors(
        misconceptions,
        correctAnswer,
        false,
      );
      if (validateDefinitionDistractors(distractors, correctAnswer)) {
        return cacheAndReturn(key, distractors);
      }

      distractors = await selectBestDistractors(
        misconceptions,
        correctAnswer,
        true,
      );
      if (validateDefinitionDistractors(distractors, correctAnswer)) {
        return cacheAndReturn(key, distractors);
      }

      const fallback = buildFallbackDefinitionDistractors(correctAnswer);
      if (fallback && fallback.length === 3) {
        return cacheAndReturn(key, fallback);
      }

      return [];
    } catch {
      return [];
    } finally {
      inflight.delete(key);
    }
  };

  const p = run();
  inflight.set(key, p);
  return p;
}
