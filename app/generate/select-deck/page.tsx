"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Deck } from "@/features/decks/types/deck";
import { getDecksByUser } from "@/lib/repositories/decksRepository";

function SelectDeck() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchDecks = async () => {
      const list = await getDecksByUser(user.uid);
      const data = list.map((deck, index) => ({
        ...deck,
        image:
          deck.image ||
          `https://picsum.photos/400/300?random=${index + 1}`,
      }));
      setDecks(data);
    };

    void fetchDecks();
  }, [authLoading, user]);

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
            >
              <img src={deck.image} className="deck-image" alt="" />

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
