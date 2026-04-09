"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useSearchParams } from "next/navigation";

type Deck = {
  id: string;
  title: string;
  subject: string;
  image: string;
};

function SelectDeck() {
    const searchParams = useSearchParams();
const selectedDeckId = searchParams.get("deckId");

console.log("Received deckId:", selectedDeckId);
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    const fetchDecks = async () => {
      const snapshot = await getDocs(collection(db, "decks"));

      const data = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        title: doc.data().title,
        subject: doc.data().subject,
        image: `https://picsum.photos/400/300?random=${index + 1}`,
      }));

      setDecks(data);
    };

    fetchDecks();
  }, []);

  return (
    <div className="app-container">
      <div className="header">
        <div className="title">Select Deck</div>
      </div>

      <div style={{ paddingTop: 10 }}>
        <div className="deck-grid">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="deck-card"
              onClick={() => {
                router.push(`/generate?deckId=${deck.id}`);
              }}
            /* onClick={() => {
  console.log("CLICK WORKING");
}}*/
            >
              <img src={deck.image} className="deck-image" />

              <div className="deck-content">
                <div className="deck-title">{deck.title}</div>
                <div className="deck-subject">{deck.subject}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default function SelectDeckPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SelectDeck />
    </Suspense>
  );
}