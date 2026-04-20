import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CreateDeckInput, Deck } from "@/features/decks/types/deck";

type DeckDoc = {
  title?: string;
  subject?: string;
  image?: string;
  userId?: string;
  totalCards?: number;
  knownCards?: number;
};

export async function getDecksByUser(userId?: string): Promise<Deck[]> {
  const deckQuery = userId
    ? query(collection(db, "decks"), where("userId", "==", userId))
    : collection(db, "decks");
  const snapshot = await getDocs(deckQuery);

  return snapshot.docs.map((deckDoc) => {
    const data = deckDoc.data() as DeckDoc;
    return {
      id: deckDoc.id,
      title: data.title ?? "",
      subject: data.subject ?? "",
      image: data.image,
      totalCards: data.totalCards,
      knownCards: data.knownCards,
    };
  });
}

export async function createDeck(
  input: CreateDeckInput & { userId?: string },
): Promise<Deck> {
  const docRef = await addDoc(collection(db, "decks"), {
    title: input.title,
    subject: input.subject,
    image: input.image ?? "",
    totalCards: 0,
    knownCards: 0,
    ...(input.userId ? { userId: input.userId } : {}),
  });

  return {
    id: docRef.id,
    title: input.title,
    subject: input.subject,
    image: input.image ?? "",
    totalCards: 0,
    knownCards: 0,
  };
}
