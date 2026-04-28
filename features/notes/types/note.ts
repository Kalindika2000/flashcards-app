export type NoteSourceType = "paste" | "pdf" | "image" | "url";

export type NoteBlockType =
  | "heading"
  | "subheading"
  | "paragraph"
  | "bullet"
  | "labeled-item"
  | "list";

export type NoteBlock = {
  id: string;
  type: NoteBlockType;
  text: string;
  label?: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  deckId: string;
  totalCards?: number;
  knownCards?: number;
  version?: number;
  summary?: string | null;
  summaryVersion?: number | null;
  blocks?: NoteBlock[];
  plainText?: string;
  sourceType?: NoteSourceType;
  originalFileName?: string;
  sourceUrl?: string;
  blockRotationIndex?: number;
  structuredContent?: string;
};

export type CreateNoteInput = {
  title: string;
  content: string;
  deckId: string;
  blocks?: NoteBlock[];
  plainText?: string;
  sourceType?: NoteSourceType;
  originalFileName?: string;
  sourceUrl?: string;
  structuredContent?: string;
};
