export type Deck = {
  id: string;
  title: string;
  subject: string;
  image?: string;
  totalCards?: number;
  knownCards?: number;
};

export type CreateDeckInput = {
  title: string;
  subject: string;
  image?: string;
};
