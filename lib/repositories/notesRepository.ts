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
import type {
  CreateNoteInput,
  Note,
  NoteBlock,
  NoteBlockType,
} from "@/features/notes/types/note";
import { noteContentToPlainText } from "@/lib/utils/formatNoteContent";
import { structureNoteContent } from "@/lib/ai/structureNoteContent";

function normalizeBlocks(raw: unknown): NoteBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const b = item as { id?: string; type?: string; text?: string; label?: string };
    let type = b.type;
    if (type === "list") type = "bullet";
    let normalizedType: NoteBlockType = "paragraph";
    if (
      type === "heading" ||
      type === "subheading" ||
      type === "paragraph" ||
      type === "bullet" ||
      type === "labeled-item" ||
      type === "list"
    ) {
      normalizedType = type;
    }
    return {
      id: typeof b.id === "string" ? b.id : `block_${i}`,
      type: normalizedType,
      text: typeof b.text === "string" ? b.text : "",
      ...(typeof b.label === "string" ? { label: b.label } : {}),
    };
  });
}

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
  blocks?: Note["blocks"];
  plainText?: string;
  sourceType?: Note["sourceType"];
  originalFileName?: string;
  sourceUrl?: string;
  blockRotationIndex?: number;
  structuredContent?: string;
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
      blocks: normalizeBlocks(data.blocks),
      plainText: data.plainText ?? "",
      sourceType: data.sourceType,
      originalFileName: data.originalFileName,
      sourceUrl: data.sourceUrl,
      blockRotationIndex: data.blockRotationIndex ?? 0,
      structuredContent: data.structuredContent ?? "",
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
    blocks: normalizeBlocks(data.blocks),
    plainText: data.plainText ?? "",
    sourceType: data.sourceType,
    originalFileName: data.originalFileName,
    sourceUrl: data.sourceUrl,
    blockRotationIndex: data.blockRotationIndex ?? 0,
    structuredContent: data.structuredContent ?? "",
  };
}

export async function createNote(
  input: CreateNoteInput & { userId?: string },
): Promise<Note> {
  const plainText = noteContentToPlainText(input.content);
  let structuredContent = plainText;
  try {
    structuredContent = await structureNoteContent(plainText);
  } catch (e) {
    console.error("Structuring failed, using plain text", e);
  }
  const source = structuredContent || plainText;

  const rawLines = source.split("\n").map((l) => l.trim()).filter(Boolean);

  const lines: string[] = [];
  let current = "";

  for (const line of rawLines) {
    const isNewBlock =
      line.startsWith("• ") ||
      line.startsWith("- ") ||
      line.startsWith("##") ||
      line.endsWith(":");

    if (isNewBlock) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(line);
      continue;
    }

    if (current) {
      current += " " + line;
    } else {
      current = line;
    }
  }

  if (current) lines.push(current);

  const blocks: NoteBlock[] = [];

  let buffer: string[] = [];
  let blockIndex = 0;

  const pushParagraph = () => {
    if (buffer.length === 0) return;
    blocks.push({
      id: `block_${blockIndex++}`,
      type: "paragraph",
      text: buffer.join(" "),
    });
    buffer = [];
  };

  for (const line of lines) {
    if (/^\w.*\d+$/.test(line)) {
      continue;
    }

    if (line.startsWith("##")) {
      pushParagraph();
      blocks.push({
        id: `block_${blockIndex++}`,
        type: "heading",
        text: line.replace(/^#{2,}\s*/, "").trim(),
      });
      continue;
    }

    if (
      line.length < 60 &&
      /^[A-Z][A-Za-z0-9\s()-]+$/.test(line)
    ) {
      pushParagraph();
      blocks.push({
        id: `block_${blockIndex++}`,
        type: "heading",
        text: line.trim(),
      });
      continue;
    }

    if (
      line.endsWith(":") &&
      line.length < 80 &&
      !/^[-•]/.test(line)
    ) {
      pushParagraph();
      blocks.push({
        id: `block_${blockIndex++}`,
        type: "subheading",
        text: line,
      });
      continue;
    }

    const labeledMatch = line.match(/^[-•]\s*([^:]+):\s*(.+)/);

    if (labeledMatch) {
      pushParagraph();
      blocks.push({
        id: `block_${blockIndex++}`,
        type: "labeled-item",
        label: labeledMatch[1].trim(),
        text: labeledMatch[2].trim(),
      });
      continue;
    }

    if (/^[-•]\s+/.test(line)) {
      pushParagraph();
      blocks.push({
        id: `block_${blockIndex++}`,
        type: "bullet",
        text: line.replace(/^[-•]\s*/, "").trim(),
      });
      continue;
    }

    buffer.push(line);
  }

  pushParagraph();

  const docRef = await addDoc(collection(db, "notes"), {
    title: input.title,
    content: input.content,
    deckId: input.deckId,
    plainText,
    structuredContent,
    blocks,
    blockRotationIndex: 0,
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
    plainText,
    structuredContent,
    blocks,
    blockRotationIndex: 0,
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
    Pick<
      Note,
      | "title"
      | "content"
      | "deckId"
      | "version"
      | "summary"
      | "summaryVersion"
      | "blockRotationIndex"
    >
  >,
): Promise<void> {
  const updates = patch;
  console.log("updateNote payload:", updates);
  await updateDoc(doc(db, "notes", noteId), updates);
}

export async function bumpNoteVersion(noteId: string): Promise<void> {
  await updateDoc(doc(db, "notes", noteId), { version: increment(1) });
}
