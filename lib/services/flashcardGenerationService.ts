import { getCurrentUserId } from "@/lib/auth/currentUser";
import { parseJsonResponse } from "@/lib/api/readJsonResponse";
import { replaceFlashcardsForNote } from "@/lib/repositories/flashcardsRepository";

type GeneratedFlashcard = {
  question: string;
  answer: string;
};

type GenerateApiResponse = {
  flashcards?: unknown;
};

export async function generateAndSaveFlashcards(params: {
  noteId: string;
  notes: string;
  noteVersion?: number;
  deckId?: string;
}): Promise<GeneratedFlashcard[]> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes: params.notes }),
  });

  const result = await parseJsonResponse<GenerateApiResponse>(response);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const raw = result.data.flashcards;
  const flashcards = Array.isArray(raw) ? raw : [];

  if (flashcards.length === 0) {
    return [];
  }

  await replaceFlashcardsForNote({
    noteId: params.noteId,
    deckId: params.deckId,
    noteVersion: params.noteVersion ?? 1,
    cards: flashcards as GeneratedFlashcard[],
    userId: getCurrentUserId(),
  });

  return flashcards as GeneratedFlashcard[];
}
