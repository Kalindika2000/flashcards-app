import {
  addDoc,
  collection,
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
import type { CreateNoteInput, Note } from "@/features/notes/types/note";

type NoteDoc = {
  title?: string;
  content?: string;
  deckId?: string;
  userId?: string;
  version?: number;
  totalCards?: number;
  knownCards?: number;
  summary?: string | null;
  summaryVersion?: number | null;
};

export async function getNotesByDeck(
  deckId: string,
  userId?: string,
): Promise<Note[]> {
  const constraints = [where("deckId", "==", deckId)];
  if (userId) {
    constraints.push(where("userId", "==", userId));
  }
  const notesQuery = query(collection(db, "notes"), ...constraints);
  const snapshot = await getDocs(notesQuery);

  return snapshot.docs.map((noteDoc) => {
    const data = noteDoc.data() as NoteDoc;
    return {
      id: noteDoc.id,
      title: data.title ?? "",
      content: data.content ?? "",
      deckId: data.deckId ?? deckId,
      version: data.version,
      totalCards: data.totalCards,
      knownCards: data.knownCards,
      summary: data.summary ?? null,
      summaryVersion: data.summaryVersion ?? null,
    };
  });
}

export async function getNoteById(
  noteId: string,
  userId?: string,
): Promise<Note | null> {
  const snapshot = await getDoc(doc(db, "notes", noteId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as NoteDoc;
  if (userId && data.userId && data.userId !== userId) return null;

  return {
    id: snapshot.id,
    title: data.title ?? "",
    content: data.content ?? "",
    deckId: data.deckId ?? "",
    version: data.version,
    totalCards: data.totalCards,
    knownCards: data.knownCards,
    summary: data.summary ?? null,
    summaryVersion: data.summaryVersion ?? null,
  };
}

export async function createNote(
  input: CreateNoteInput & { userId?: string },
): Promise<Note> {
  const docRef = await addDoc(collection(db, "notes"), {
    title: input.title,
    content: input.content,
    deckId: input.deckId,
    createdAt: serverTimestamp(),
    totalCards: 0,
    knownCards: 0,
    version: 1,
    summary: null,
    summaryVersion: null,
    ...(input.userId ? { userId: input.userId } : {}),
  });

  return {
    id: docRef.id,
    title: input.title,
    content: input.content,
    deckId: input.deckId,
    version: 1,
    totalCards: 0,
    knownCards: 0,
    summary: null,
    summaryVersion: null,
  };
}

export async function updateNote(
  noteId: string,
  patch: Partial<
    Pick<Note, "title" | "content" | "deckId" | "version" | "summary" | "summaryVersion">
  >,
): Promise<void> {
  const updates = patch;
  console.log("updateNote payload:", updates);
  await updateDoc(doc(db, "notes", noteId), updates);
}

export async function bumpNoteVersion(noteId: string): Promise<void> {
  await updateDoc(doc(db, "notes", noteId), { version: increment(1) });
}
