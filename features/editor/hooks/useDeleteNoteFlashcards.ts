"use client";

import { useCallback } from "react";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { deleteFlashcardsByNote } from "@/lib/repositories/flashcardsRepository";

/** Deletes all flashcards for the current note (no loading / preview on the editor). */
export function useDeleteNoteFlashcards(noteId: string | null) {
  const deleteAllFlashcards = useCallback(async () => {
    if (!noteId) return;
    const userId = getCurrentUserId();
    await deleteFlashcardsByNote(noteId, userId);
  }, [noteId]);

  return { deleteAllFlashcards };
}
