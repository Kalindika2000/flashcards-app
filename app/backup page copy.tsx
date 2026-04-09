"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

type FlashcardType = {
  id?: string;
  question: string;
  answer: string;
};

export default function Home() {
  const [notes, setNotes] = useState("");
  const [lastGeneratedNotes, setLastGeneratedNotes] = useState("");
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const loadFlashcards = async () => {
  const querySnapshot = await getDocs(collection(db, "flashcards"));
 
  const cards = querySnapshot.docs.map((doc) => {
    return {
      id: doc.id,
      ...(doc.data() as Omit<FlashcardType, "id">),
    };
  });

 
  setFlashcards(cards);
};
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<number[]>([]);
  const [restartMode, setRestartMode] = useState<"all" | "difficult">("all");
  const remainingCards = flashcards.filter(
    (_, index) => !knownCards.includes(index)
  );
  
  const allMastered = knownCards.length === flashcards.length;
  const someKnown = knownCards.length > 0;
  const [visitedCards, setVisitedCards] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionCards, setSessionCards] = useState<number[]>(() => []);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  
  //SAVE FLASHCARDS
const saveFlashcards = async (cards: FlashcardType[]) => {
  try {
    for (const card of cards) {
      await addDoc(collection(db, "flashcards"), {
        question: card.question,
        answer: card.answer,
        noteId: "note_1",
        createdAt: serverTimestamp(),
        known: false,
      });

      }

    } catch (error) {
    console.error("Error saving flashcards:", error);
  }
};

const deleteAllFlashcards = async () => {
  const snapshot = await getDocs(collection(db, "flashcards"));

  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, "flashcards", document.id));
  }

  
  setFlashcards([]);
  setCurrentIndex(0);
};
  const generateFlashcards = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setLoadingMessage("Reading your notes...");

    try {
      await new Promise((res) => setTimeout(res, 800));
      setLoadingMessage("Creating flashcards...");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      
      if (!data.flashcards || data.flashcards.length === 0) {
        alert("No flashcards returned");
        return;
      }

      await saveFlashcards(data.flashcards);
      await loadFlashcards();
      setCurrentIndex(0);
      setFlipped(false);
      setKnownCards([]);
      setLastGeneratedNotes(notes);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Check console.");
    } finally {
      setLoading(false);
    }
  };

 const goNext = () => {
  if (activeCards.length === 0) return;

  setFlipped(false);

  if (!knownCards.includes(actualIndex)) {
    setStreak(0);
  }

  // ✅ if already at last card → complete session
  if (currentIndex >= activeCards.length - 1) {
    setIsSessionComplete(true);
    return;
  }

  setCurrentIndex((prev) => prev + 1);
};


 const goPrev = () => {
  if (activeCards.length === 0) return;

  setFlipped(false);

  if (!knownCards.includes(actualIndex)) {
    setStreak(0);
  }

  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
};

useEffect(() => {
  if (flashcards.length > 0) {
    setVisitedCards([0]);
  }
}, [flashcards]);


const activeCards =
  sessionCards.length > 0
    ? sessionCards
    : flashcards.map((_, i) => i);

const actualIndex = activeCards[currentIndex] ?? currentIndex;


const visitedActiveCount = activeCards.filter((i) =>
  visitedCards.includes(i)
).length;

const sessionComplete =
  activeCards.length > 0 &&
  currentIndex === activeCards.length - 1;
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "sans-serif",
        padding: "20px",
      }}
    >
      {/* INPUT SECTION */}
      <div style={{ width: "100%", maxWidth: "900px" }}>
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
          Flashcards
        </h1>
        
<button
  onClick={deleteAllFlashcards}
  style={{
    marginBottom: "10px",
    padding: "8px 12px",
    background: "red",
    color: "white",
    border: "none",
    borderRadius: "6px",
  }}
>
  Delete All Flashcards
</button>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste your notes here..."
          style={{
            width: "100%",
            height: "140px",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            marginBottom: "12px",
            fontSize: "14px",
          }}
        />

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
  onClick={generateFlashcards}
  disabled={loading || (notes === lastGeneratedNotes && flashcards.length > 0)}
            style={{
              width: "50%",
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: "#2563eb",
              color: "white",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            {loading
  ? "Generating..."
  : notes === lastGeneratedNotes && flashcards.length > 0
  ? "Already Generated"
  : "Generate Flashcards"}
          </button>
        </div>

        {loading && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <div className="spinner"></div>
            <p style={{ marginTop: "10px", color: "#666" }}>
              {loadingMessage}
            </p>
          </div>
        )}
      </div>

      {/* FLASHCARD SECTION */}
      {flashcards.length > 0 && !isSessionComplete && !allMastered && (
        <div
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start", // ✅ vertical center
            alignItems: "center",
            gap: "20px",
            marginTop: "40px",
          }}
        >
          {/* CARD */}
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              height: "200px",
              perspective: "1000px",
              position: "relative",
              zIndex: 1, // 👈 card layer
            }}
          >
            <div
             
              style={{
                width: "100%",
                height: "100%",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.5s ease",
                  transform: flipped
                    ? "rotateY(180deg)"
                    : "rotateY(0deg)",
                }}
              >
                {/* FRONT */}
                <div
                     onClick={(e) => {
                      const target = e.target as HTMLElement;

                      if (target.closest("button")) return;

                      setFlipped(true);
                    }}
                     style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      background: "#e5e5e5",
                      borderRadius: "16px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "24px",
                      textAlign: "center",
                      backfaceVisibility: "hidden",
                      overflow: "auto",
                      cursor: "pointer",
              }}
                >
                  <div style={{ fontSize: "20px", fontWeight: "600" }}>
                    {flashcards[actualIndex]?.question}
                  </div>
                </div>

                {/* BACK */}
                <div
                  onClick={(e) => {
                    const target = e.target as HTMLElement;

                    if (target.closest("button")) return;

                    setFlipped(false);
                  }}
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    background: "#e5e5e5",
                    borderRadius: "16px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    textAlign: "center",
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                    overflow: "auto",
                    cursor: "pointer",
                  }}
                >
              
                  <div style={{ fontSize: "18px", lineHeight: "1.5" }}>
                    {flashcards[actualIndex]?.answer}
                  </div>
                </div>
              </div>
            </div>
          </div>
         <p
  style={{
    fontSize: "16px",
    fontWeight: "600",
    marginTop: "60px", // 👈 pushes it DOWN
  }}
>
  🔥 Streak: {streak} | 🏆 Best: {bestStreak}
</p>
          <p style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
            Card {currentIndex + 1} of {activeCards.length}
          </p>
          <div style={{ width: "100%", maxWidth: "500px" }}>
  <div
    style={{
      height: "6px",
      background: "#ddd",
      borderRadius: "6px",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${
          activeCards.length === 0
            ? 0
            : ((currentIndex + 1) / activeCards.length) * 100
        }%`,
        background: "#2563eb",
        height: "100%",
      }}
    />
  </div>
</div>
          {/* ACTION BUTTONS */}
          {flipped && (
            <div style={{ display: "flex", gap: "12px",marginTop: "80px", position: "relative",
              zIndex: 2,}}>
              <button
                disabled={knownCards.includes(actualIndex)}
                onClick={async (e) => {
                  e.stopPropagation();

                  const card = flashcards[actualIndex];

                  if (!card.id) return; // safety check

                  // ✅ Update Firebase
                  await updateDoc(doc(db, "flashcards", card.id), {
                    known: true,
                  });

                  // ✅ Update local state (for UI)
                  setKnownCards((prev) =>
                    prev.includes(actualIndex) ? prev : [...prev, actualIndex]
                    );
                    setStreak((prev) => {
                    const newStreak = prev + 1;

                    setBestStreak((best) =>
                      newStreak > best ? newStreak : best
                    );

                    return newStreak;
                  });
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: knownCards.includes(actualIndex) ? "#9ca3af" : "#22c55e",
                  color: "white",
                  cursor: knownCards.includes(actualIndex) ? "not-allowed" : "pointer",
                  opacity: knownCards.includes(actualIndex) ? 0.7 : 1,
                }}
              >
                ✅ {knownCards.includes(actualIndex) ? "✔ Known" : "I know this"}
              </button>

                </div>
          )}

          {/* NAVIGATION */}
          <div style={{ display: "flex", gap: "12px", marginTop: "50px" }}>
  <button
    onClick={goPrev}
    disabled={
      currentIndex === 0 ||
      !flashcards
        .slice(0, currentIndex)
        .some((_, i) => !knownCards.includes(i))
    }
  >
    Prev
    </button>

  <button
  onClick={goNext}
>
  {currentIndex >= activeCards.length - 1 ? "Finish" : "Next"}
</button>
</div>
        </div>
      )}

      {/* MASTERED STATE */}
{(isSessionComplete || allMastered) && flashcards.length > 0 && (
  <div style={{ textAlign: "center", marginTop: "40px" }}>
    
    <h2>🎉 Session Complete!</h2>

    {allMastered ? (
      <p>You’ve mastered all flashcards.</p>
    ) : (
      <p>You’ve reviewed all cards.</p>
    )}

    {/* SHOW TOGGLE ONLY IF SOME KNOWN BUT NOT ALL */}
    {!allMastered && someKnown && (
      <div style={{ marginTop: "20px" }}>
        <label>
          <input
            type="radio"
            value="all"
            checked={restartMode === "all"}
            onChange={() => setRestartMode("all")}
          />
          All cards
        </label>

        <label style={{ marginLeft: "12px" }}>
          <input
            type="radio"
            value="difficult"
            checked={restartMode === "difficult"}
            onChange={() => setRestartMode("difficult")}
          />
          Difficult cards only
        </label>
      </div>
    )}

    <button
    onClick={async () => {
  const newCards =
    restartMode === "all"
      ? flashcards.map((_, i) => i)
      : flashcards
          .map((_, i) => i)
          .filter((i) => !knownCards.includes(i));

  setSessionCards(newCards);

  if (restartMode === "all") {
  // ✅ Reset Firebase flags
  for (const card of flashcards) {
    if (!card.id) continue;

    await updateDoc(doc(db, "flashcards", card.id), {
      known: false,
    });
  }

  // ✅ Reset local state
  setKnownCards([]);
}

  setCurrentIndex(0);

  if (newCards.length > 0) {
    setVisitedCards([newCards[0]]);
  } else {
    setVisitedCards([]);
  }

  setFlipped(false);
  setStreak(0);
  setIsSessionComplete(false);
}}
      style={{
        marginTop: "20px",
        padding: "10px 20px",
        borderRadius: "10px",
        border: "none",
        background: "#2563eb",
        color: "white",
        cursor: "pointer",
      }}
    >
      Restart
    </button>
  </div>
)}

      {/* SPINNER */}
      <style jsx>{`
        .spinner {
          margin: 0 auto;
          width: 30px;
          height: 30px;
          border: 4px solid #ddd;
          border-top: 4px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}