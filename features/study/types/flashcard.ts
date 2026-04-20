export type Flashcard = {
  id?: string;
  question: string;
  answer: string;
  noteId: string;
  deckId?: string;
  known?: boolean;
  noteVersion?: number;
  timesSeen?: number;
  timesCorrect?: number;
};
