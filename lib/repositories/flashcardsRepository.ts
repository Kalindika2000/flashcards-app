import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Flashcard } from "@/features/study/types/flashcard";

type FlashcardDoc = {
  question?: string;
  answer?: string;
  difficulty?: "easy" | "medium" | "hard";
  noteId?: string;
  deckId?: string;
  known?: boolean;
  noteVersion?: number;
  timesSeen?: number;
  timesCorrect?: number;
  userId?: string;
};

async function syncNoteCardAggregatesFromFlashcards(
  noteId: string,
  userId?: string,
): Promise<void> {
  const cards = await getFlashcardsByNote(noteId, userId);
  const totalCards = cards.length;
  const knownCards = cards.filter((c) => c.known).length;
  await updateDoc(doc(db, "notes", noteId), { totalCards, knownCards });
}

async function syncDeckCardAggregatesFromNotes(
  deckId: string,
  userId?: string,
): Promise<void> {
  if (!deckId) return;
  const constraints = [where("deckId", "==", deckId)];
  if (userId) constraints.push(where("userId", "==", userId));
  const snapshot = await getDocs(query(collection(db, "notes"), ...constraints));
  let totalCards = 0;
  let knownCards = 0;
  for (const d of snapshot.docs) {
    const data = d.data() as { totalCards?: number; knownCards?: number };
    totalCards += typeof data.totalCards === "number" ? data.totalCards : 0;
    knownCards += typeof data.knownCards === "number" ? data.knownCards : 0;
  }
  await updateDoc(doc(db, "decks", deckId), { totalCards, knownCards });
}

export async function getFlashcardsByNote(
  noteId: string,
  userId?: string,
): Promise<Flashcard[]> {
  const constraints = [where("noteId", "==", noteId)];
  if (userId) {
    constraints.push(where("userId", "==", userId));
  }
  const flashcardsQuery = query(collection(db, "flashcards"), ...constraints);
  const snapshot = await getDocs(flashcardsQuery);

  return snapshot.docs.map((flashDoc) => {
    const data = flashDoc.data() as FlashcardDoc;
    return {
      id: flashDoc.id,
      question: data.question ?? "",
      answer: data.answer ?? "",
      difficulty: data.difficulty ?? "medium",
      noteId: data.noteId ?? noteId,
      deckId: data.deckId,
      known: data.known ?? false,
      noteVersion: data.noteVersion,
      timesSeen: data.timesSeen,
      timesCorrect: data.timesCorrect,
    };
  });
}

export async function deleteFlashcardsByNote(
  noteId: string,
  userId?: string,
  options?: { skipAggregateSync?: boolean },
): Promise<{ totalDeleted: number; knownDeleted: number }> {
  const constraints = [where("noteId", "==", noteId)];
  if (userId) constraints.push(where("userId", "==", userId));
  const snapshot = await getDocs(query(collection(db, "flashcards"), ...constraints));

  const noteSnap = await getDoc(doc(db, "notes", noteId));
  const deckId = noteSnap.exists()
    ? (noteSnap.data() as { deckId?: string }).deckId
    : undefined;

  let totalDeleted = 0;
  let knownDeleted = 0;

  for (const document of snapshot.docs) {
    const data = document.data() as FlashcardDoc;
    if (data.known) knownDeleted += 1;
    totalDeleted += 1;
    await deleteDoc(doc(db, "flashcards", document.id));
  }

  if (!options?.skipAggregateSync) {
    await syncNoteCardAggregatesFromFlashcards(noteId, userId);
    if (deckId) await syncDeckCardAggregatesFromNotes(deckId, userId);
  }

  return { totalDeleted, knownDeleted };
}

export async function replaceFlashcardsForNote(params: {
  noteId: string;
  deckId?: string;
  noteVersion?: number;
  cards: Array<Pick<Flashcard, "question" | "answer" | "difficulty">>;
  userId?: string;
}): Promise<void> {
  await deleteFlashcardsByNote(params.noteId, params.userId, {
    skipAggregateSync: true,
  });

  for (const card of params.cards) {
    await addDoc(collection(db, "flashcards"), {
      question: card.question,
      answer: card.answer,
      difficulty: card.difficulty ?? "medium",
      noteId: params.noteId,
      deckId: params.deckId ?? "",
      createdAt: serverTimestamp(),
      noteVersion: params.noteVersion ?? 1,
      known: false,
      timesSeen: 0,
      timesCorrect: 0,
      ...(params.userId ? { userId: params.userId } : {}),
    });
  }

  await syncNoteCardAggregatesFromFlashcards(params.noteId, params.userId);
  if (params.deckId) {
    await syncDeckCardAggregatesFromNotes(params.deckId, params.userId);
  }
}

export async function markFlashcardResult(params: {
  flashcardId: string;
  isKnown: boolean;
}): Promise<void> {
  const flashRef = doc(db, "flashcards", params.flashcardId);
  const snap = await getDoc(flashRef);
  if (!snap.exists()) return;

  const before = snap.data() as FlashcardDoc;
  const noteId = before.noteId;
  const deckId = before.deckId;
  const userId = before.userId;

  await updateDoc(flashRef, {
    known: params.isKnown,
    timesSeen: increment(1),
    timesCorrect: params.isKnown ? increment(1) : increment(0),
  });

  if (noteId) {
    await syncNoteCardAggregatesFromFlashcards(noteId, userId);
  }
  if (deckId) {
    await syncDeckCardAggregatesFromNotes(deckId, userId);
  }
}

export async function setFlashcardKnown(params: {
  flashcardId: string;
  known: boolean;
}): Promise<void> {
  const flashRef = doc(db, "flashcards", params.flashcardId);
  const snap = await getDoc(flashRef);
  if (!snap.exists()) return;

  const before = snap.data() as FlashcardDoc;
  const noteId = before.noteId;
  const deckId = before.deckId;
  const userId = before.userId;

  await updateDoc(flashRef, { known: params.known });

  if (noteId) {
    await syncNoteCardAggregatesFromFlashcards(noteId, userId);
  }
  if (deckId) {
    await syncDeckCardAggregatesFromNotes(deckId, userId);
  }
}
