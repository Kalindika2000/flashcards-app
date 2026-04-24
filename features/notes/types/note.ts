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
};

export type CreateNoteInput = {
  title: string;
  content: string;
  deckId: string;
};
