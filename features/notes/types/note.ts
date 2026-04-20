export type Note = {
  id: string;
  title: string;
  content: string;
  deckId: string;
  totalCards?: number;
  knownCards?: number;
  version?: number;
};

export type CreateNoteInput = {
  title: string;
  content: string;
  deckId: string;
};
