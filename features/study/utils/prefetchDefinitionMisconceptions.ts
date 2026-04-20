import type { Flashcard } from "@/features/study/types/flashcard";
import { chunk } from "@/lib/utils/chunk";
import {
  generateMisconceptions,
  generateMisconceptionsBatch,
  sanitizeMisconceptionsList,
  type MisconceptionBatchItem,
} from "@/features/study/utils/definitionTwoStepDistractors";
import { getQuestionType } from "@/features/study/utils/getQuestionType";
import type { McqDifficulty } from "@/features/study/utils/mcqDifficulty";

/** Between 3 and 5; keeps prompts small and avoids token overflow. */
const BATCH_SIZE = 4;

async function singleItemFallbackBatch(
  batch: MisconceptionBatchItem[],
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const item of batch) {
    const raw = await generateMisconceptions(
      item.question,
      item.answer,
      item.difficulty ?? "medium",
    );
    const sanitized = sanitizeMisconceptionsList(raw, item.answer);
    if (sanitized.length >= 3) {
      out[item.flashcardId] = sanitized;
    }
  }
  return out;
}

/**
 * One batch: batch API, then single-item Step 1 for any flashcardId missing or invalid.
 */
async function processBatchWithFallback(
  batch: MisconceptionBatchItem[],
): Promise<Record<string, string[]>> {
  let map: Record<string, string[]> = {};
  try {
    map = await generateMisconceptionsBatch(batch);
  } catch {
    return singleItemFallbackBatch(batch);
  }

  const out: Record<string, string[]> = { ...map };

  for (const item of batch) {
    if (out[item.flashcardId] !== undefined) continue;

    const raw = await generateMisconceptions(
      item.question,
      item.answer,
      item.difficulty ?? "medium",
    );
    const sanitized = sanitizeMisconceptionsList(raw, item.answer);
    if (sanitized.length >= 3) {
      out[item.flashcardId] = sanitized;
    }
  }

  return out;
}

/**
 * Preloads Step-1 misconceptions for definition-type MCQs (Challenge mode batching).
 * Safe to call when there are no definition cards (returns {}).
 */
export async function prefetchDefinitionMisconceptionsForChallenge(
  flashcards: Flashcard[],
  difficultyByFlashcardId?: Record<string, McqDifficulty>,
): Promise<Record<string, string[]>> {
  const withIds = flashcards.filter(
    (c): c is Flashcard & { id: string } => Boolean(c.id?.trim()),
  );

  if (flashcards.length < 4) {
    return {};
  }

  const definitionCards = withIds.filter(
    (c) => getQuestionType(c.question ?? "") === "definition",
  );

  const items: MisconceptionBatchItem[] = definitionCards
    .map((c) => ({
      flashcardId: c.id,
      question: c.question?.trim() ?? "",
      answer: c.answer?.trim() ?? "",
      difficulty: difficultyByFlashcardId?.[c.id] ?? "medium",
    }))
    .filter((it) => it.question.length > 0 && it.answer.length > 0);

  if (items.length === 0) {
    return {};
  }

  const batches = chunk(items, BATCH_SIZE);
  const results = await Promise.all(
    batches.map((b) => processBatchWithFallback(b)),
  );
  return Object.assign({}, ...results);
}
