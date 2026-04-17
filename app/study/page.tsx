/*This is the page where notes anf relted flashcards are displayed for study. Navigationis via Decks-Notes */
"use client";

import ModeSelection from "@/components/ModeSelection";
import TopSwitch from "@/components/TopSwitch";
import { Suspense } from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { generateChallengeClips } from "@/lib/challengeGeneratorUtil";
import BottomNav from "@/components/BottomNav";
import Mascot from "@/components/Mascot";
import type { Challenge } from "@/lib/challengeGeneratorUtil";
//import { generateSmartOptions } from "@/lib/smartOptions";


import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  addDoc,
  deleteDoc, 
} from "firebase/firestore";

type FlashcardType = {
  id?: string;
  question: string;
  answer: string;
  noteId?: string;
  known?: boolean;
  noteVersion?: number;
};

  function StudyPage() {
  
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState("medium");
const [selectedOption, setSelectedOption] = useState<number | null>(null);
const [streak, setStreak] = useState(0);
const [showResult, setShowResult] = useState(false);  const [isNotesOpen, setIsNotesOpen] = useState(true);


const [mode, setMode] = useState<"flashcards" | "challenge" | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const noteId = searchParams.get("noteId");
const [sessionCards, setSessionCards] = useState<number[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  //const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
const [challengeIndex, setChallengeIndex] = useState(0);



  const [note, setNote] = useState<{
  title: string;
  content: string;
  version?: number;
} | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  useEffect(() => {
  if (challenges.length > 0) {
    setCurrentOptions(challenges[challengeIndex]?.options || []);
  }
}, [challengeIndex, challenges]);
  //const [knownCards, setKnownCards] = useState<number[]>([]);
  
  const [bestStreak, setBestStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFeedback, setShowFeedback] = useState<null | "known" | "unknown">(null);
  
  const [isFading, setIsFading] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
const [restartMode, setRestartMode] = useState<"all" | "difficult">("all");
const [loading, setLoading] = useState(false);
const [loadingMessage, setLoadingMessage] = useState("");
const [mascotMood, setMascotMood] = useState("idle");
const [mistakeCount, setMistakeCount] = useState(0);
const [phase, setPhase] = useState<"phase1" | "phase2">("phase1");
const [sessionTotal, setSessionTotal] = useState(0);
const [phaseTotal, setPhaseTotal] = useState(0);
const [phase2Cards, setPhase2Cards] = useState<number[]>([]);
const ENABLE_ADAPTIVE = true;
//const ENABLE_ADAPTIVE = false;
const activeCards =
  phase === "phase2"
    ? phase2Cards
    : sessionCards.length > 0
    ? sessionCards
    : flashcards.map((_, i) => i);
    const knownCount = flashcards.filter((c) => c.known).length;
const someKnown = knownCount > 0;
const allMastered = knownCount === flashcards.length;
const actualIndex =
  activeCards[currentIndex] !== undefined
    ? activeCards[currentIndex]
    : currentIndex;

const isOutdated =
  flashcards.length > 0 &&
  note?.version !== undefined &&
  flashcards.some(
    (card) =>
      (card as any).noteVersion !== (note.version ?? 1)
  );
  

  // ✅ LOAD ONLY CARDS FOR THIS NOTE
 /* const loadFlashcards = async () => {
    if (!noteId) return;

    const q = query(
      collection(db, "flashcards"),
      where("noteId", "==", noteId)
    );

    const snapshot = await getDocs(q);

    const cards = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as FlashcardType),
    }));

    setFlashcards(cards);
  };*/

  const loadFlashcards = async () => {
  if (!noteId) return;

  //setLoading(true);
  //setLoadingMessage("Loading your flashcards...");

  const q = query(
    collection(db, "flashcards"),
    where("noteId", "==", noteId)
  );

  const snapshot = await getDocs(q);

  const cards: FlashcardType[] = snapshot.docs.map((doc) => {
  const data = doc.data() as any;

  return {
    id: doc.id,
    question: data.question,
    answer: data.answer,
    noteId: data.noteId,
    known: data.known ?? false,
    noteVersion: data.noteVersion ?? 1,
  };
});

  setFlashcards(cards);
/*setKnownCards(
  cards
    .map((card, index) => (card.known ? index : -1))
    .filter((i) => i !== -1)
);*/
  setLoading(false);
};
const handleGenerateChallenges = async () => {
  setChallenges([]);
  if (!note?.content) return;

  setLoading(true);
  setLoadingMessage("Creating challenge clips...");

  try {
    const result = await generateChallengeClips(note.content, difficulty);

    setLoadingMessage("Preparing your challenge session...");

    setChallenges(result);
    setChallengeIndex(0);
    

    setLoading(false);
  } catch (err) {
    setLoading(false);
    console.error(err);
    alert("Failed to generate challenges");
  }
};

const handleGenerateFlashcards = async () => {
  if (!note?.content || !noteId) return;

  const plainText = note.content.replace(/<[^>]*>/g, "").trim();
  if (!plainText) return;
  setLoading(true);
setLoadingMessage("Generating flashcards...");

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes: note.content }),
    });

    if (!res.ok) throw new Error("API failed");

    const data = await res.json();

    if (!data.flashcards || data.flashcards.length === 0) {
      alert("No flashcards returned");
      return;
    }
    setLoadingMessage("Saving your flashcards...");   
    // 🔥 DELETE old flashcards first
    const q = query(
      collection(db, "flashcards"),
      where("noteId", "==", noteId)
    );

    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, "flashcards", docSnap.id));
    }
    for (const card of data.flashcards) {
      
      await addDoc(collection(db, "flashcards"), {
        question: card.question,
        answer: card.answer,
        noteId: noteId,
        createdAt: new Date(),
        noteVersion: note?.version ?? 1,
        known: false,
      });
    }

    await loadFlashcards();
    setIsSessionComplete(false);
    setMode("flashcards");

  } catch (err) {
  setLoading(false);
  console.error(err);
  alert("Failed to generate flashcards");
}
};
const handleSwipeEnd = (event: any, info: any) => {
  console.log("DRAG OFFSET:", info.offset.y);

  const threshold =60;

  if (info.offset.y < -threshold) {
    if (challengeIndex < challenges.length - 1) {
      setChallengeIndex((prev) => prev + 1);
      
    }
  }

  if (info.offset.y > threshold) {
    if (challengeIndex > 0) {
      setChallengeIndex((prev) => prev - 1);
      
    }
  }
};
 
useEffect(() => {
  if (!noteId) return;

  const fetchNote = async () => {
    const docRef = doc(db, "notes", noteId);
    const snapshot = await getDocs(
      query(collection(db, "notes"), where("__name__", "==", noteId))
    );

    if (!snapshot.empty) {
      setNote(snapshot.docs[0].data() as any);
    }
  };

  fetchNote();
}, [noteId]);

useEffect(() => {
  if (flashcards.length > 0 && phase === "phase1") {
    setSessionTotal(flashcards.length);
    setPhaseTotal(flashcards.length);
  }
}, [flashcards]);

const handleFlashcards = async () => {
  setSessionCards([]); // ensures clean session
  setMode("flashcards");

  await loadFlashcards();
  //setSessionTotal(flashcards.length);
};
const resetMode = () => {
  setMode(null);
  setSessionCards([]); // ✅ CRITICAL FIX
  setCurrentIndex(0);
  setFlipped(false);
  setIsSessionComplete(false);
  setPhase("phase1");
  setSessionTotal(0); 

};
const handleChallenge = () => {
  setChallenges([]); // ensure fresh state
  setMode("challenge");
};
  const goNext = () => {
    if (currentIndex >= activeCards.length - 1) {
  if (!ENABLE_ADAPTIVE) {
    setIsSessionComplete(true);
    return;
  }

  const hasUnknown = flashcards.some(card => !card.known);

  // 👉 START PHASE 2
  if (phase === "phase1" && hasUnknown) {
 const unknownIndexes = flashcards
  .map((card, index) => (!card.known ? index : -1))
  .filter((index) => index !== -1);

setPhase2Cards(unknownIndexes);
setPhaseTotal(unknownIndexes.length);

  setPhase("phase2");
  setCurrentIndex(0);
  setFlipped(false);
  return;
}

  // 👉 END SESSION
  // 👉 If still unknown cards, keep repeating Phase 2
// 👉 If still unknown cards, repeat Phase 2 with UPDATED cards
if (phase === "phase2" && hasUnknown) {
  const unknownIndexes = flashcards
    .map((card, index) => (!card.known ? index : -1))
    .filter((index) => index !== -1);

  setPhase2Cards(unknownIndexes);
  setPhaseTotal(unknownIndexes.length);

  setCurrentIndex(0);
  setFlipped(false);
  return;
}

// 👉 Otherwise end session
setIsSessionComplete(true);
return;
}

    setFlipped(false);

    if (flashcards[actualIndex]?.known) {
  setStreak(0);
}

    setCurrentIndex((prev) => prev + 1);
  };

  const goPrev = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  

    


const restart = async () => {
  setPhase("phase1");
setSessionTotal(0); // ✅ ADD THIS LINE

  setLoading(true);
  setLoadingMessage("Refreshing your cards...");

  // 🔁 ALWAYS FETCH FRESH DATA FROM DB

const freshCards = flashcards;

  // ✅ update local state with fresh DB data
  setFlashcards(freshCards);

  let newCards: number[];

  if (restartMode === "all") {
    // RESET DB FLAGS
   
    newCards = freshCards.map((_, i) => i);

    //setKnownCards([]);
  } else {
    // ✅ FILTER USING DB VALUE (NOT local state)
    newCards = freshCards
      .map((card, i) => (card.known ? -1 : i))
      .filter((i) => i !== -1);
  }

  setSessionCards(newCards);
  setCurrentIndex(0);
  setFlipped(false);
  setStreak(0);
  setIsSessionComplete(false);

  setLoading(false);
};


 

  //const currentCard = flashcards[currentIndex];
const currentCard = flashcards[actualIndex];
const handleMarkCard = async () => {
  const card = flashcards[actualIndex];
  const newKnownState = !card?.known;
// ✅ TRACK FAILED / SUCCESS

  if (card?.id) {
    await updateDoc(doc(db, "flashcards", card.id), {
      known: newKnownState,
    });
  }


  if (newKnownState) {
  setStreak((prev) => {
    const newStreak = prev + 1;

    // update best streak
    setBestStreak((best) =>
      newStreak > best ? newStreak : best
    );

    // 🎉 trigger AFTER state update
    if (newStreak % 5 === 0) {
      setShowConfetti(true);

      setTimeout(() => {
        setShowConfetti(false);
      }, 1200);
    }

    return newStreak;
  });

  setShowFeedback("known");
setMascotMood("happy");
setIsFading(false);

setTimeout(() => {
  setIsFading(true); // start fade
}, 1000);

setTimeout(() => {
  setShowFeedback(null); // remove AFTER fade
}, 1600);

  // reset mistakes on success
  setMistakeCount(0);
}else {
  setStreak(0);
  setShowFeedback("unknown");
setMascotMood("sad");
setIsFading(false);

setTimeout(() => {
  setIsFading(true);
}, 900);

setTimeout(() => {
  setShowFeedback(null);
}, 1500);

  setMistakeCount((prev) => prev + 1);
}

 
setTimeout(() => {
  setMascotMood("idle");
}, 1800);
    setTimeout(() => {
  setFlashcards((prev) =>
    prev.map((c, idx) =>
      idx === actualIndex
        ? { ...c, known: newKnownState }
        : c
    )
  );

  goNext();
}, 300);
};
  return (
    <div
  className="app-container"
  style={{
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  }}
>
  <div style={{ color: "red" }}>
    DEBUG → mode: {mode}
  </div>
  
      {/* <h1>Study</h1> */}

      {/* HEADER */}

<div className="header">
  <div className="header-top">
    <div className="menu" onClick={() => router.back()}>
      ←
    </div>

    <div className="header-text">
      
      {phase === "phase2" && (
  <div style={{ textAlign: "center", marginTop: "10px", fontWeight: "bold" }}>
    Let’s review the tricky ones
  </div>
)}
      <div className="subtitle">Review your cards</div>
    </div>

    <div style={{ width: "24px" }} />
  </div>
</div>
<div
  style={{
    padding: "20px",
   // paddingBottom: "80px",
   paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box", // ✅ THIS FIXES MOBILE SHIFT
  }}
>
      {note && (
  <div style={{ width: "100%", maxWidth: "900px", marginTop: "10px" }}>
    
   <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  }}
>
  <div
    onClick={() => setIsNotesOpen((prev) => !prev)}
    style={{
      cursor: "pointer",
      fontWeight: "600",
    }}
  >
    {isNotesOpen ? "▼ Notes" : "▶ Notes"}
  </div>

  <button
    onClick={() => {
  const deckId = searchParams.get("deckId") || "";
  router.push(`/editor?noteId=${noteId}&deckId=${deckId}`);
}}
    style={{
      padding: "4px 10px",
      fontSize: "12px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      background: "white",
      cursor: "pointer",
    }}
  >
    ✏️ Edit
  </button>
</div>

    {isNotesOpen && (
      <div
  style={{
    marginBottom: "20px",
    padding: "16px",
    background: "#f9fafb",
    borderRadius: "12px",
    maxHeight: "30vh",
    overflowY: "auto",
    scrollBehavior: "smooth",
  }}
>
        <div style={{ fontSize: "18px", fontWeight: "bold" }}>
          {note.title}
        </div>

        <div
  className="note-content"
  style={{
    fontSize: "14px",
    color: "#555",
    marginTop: "6px",
    lineHeight: "1.6",
  }}
  dangerouslySetInnerHTML={{ __html: note.content }}
/>
      </div>
    )}
  </div>
)}


{mode === null ? (
  <div
    style={{
      marginTop: "20px",
      marginBottom: "20px",
      fontWeight: "600",
    }}
  >
    Choose how you want to study
  </div>
) : (
  <div
  style={{
    marginTop: "20px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
  <button
    onClick={resetMode}
    style={{
      background: "none",
      border: "none",
      color: "#2563eb",
      fontWeight: "600",
      cursor: "pointer",
      textAlign: "left",
    }}
  >
    ← Back to study modes
  </button>


{mode === "challenge" && challenges.length === 0 && (
  <div style={{ marginTop: "20px", textAlign: "center" }}>
    <h3>Select Difficulty</h3>

    <div style={{ marginBottom: "12px" }}>
      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>

    <button
      onClick={handleGenerateChallenges}
      style={{
        padding: "10px 16px",
        borderRadius: "8px",
        border: "none",
        background: "#2563eb",
        color: "white",
        cursor: "pointer",
      }}
    >
      Start Challenge
    </button>
  </div>
)}

  {mode === "challenge" && challenges.length > 0 && (
    <div
      style={{
        fontSize: "14px",
        fontWeight: "600",
        color: "#6b7280",
      }}
    >
      Challenge Mode
    </div>
  )}
</div>
)}
{loading && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(255,255,255,0.8)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 99999,
    }}
  >
    <div className="spinner"></div>
    <p style={{ marginTop: "12px", color: "#333", fontWeight: "500" }}>
      {loadingMessage}
    </p>
  </div>
)}
{mode === null && (
  <div
    style={{
  background: "#ffffff",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
  marginTop: "10px",
}}
  >
    <ModeSelection
      onSelectFlashcards={handleFlashcards}
      onSelectChallenge={handleChallenge}
    />
  </div>
)}

      {(flashcards.length === 0 || isOutdated) && mode === "flashcards" && (
  <div style={{ marginTop: "20px", textAlign: "center" }}>
    <p>
  {isOutdated
    ? "⚠️ Flashcards are outdated. Please regenerate them."
    : "No cards found."}
</p>

    <button
      onClick={handleGenerateFlashcards}
      style={{
        marginTop: "10px",
        padding: "10px 16px",
        borderRadius: "8px",
        border: "none",
        background: "#2563eb",
        color: "white",
        cursor: "pointer",
      }}
    >
      Generate Flashcards
    </button>
  </div>
)}
      {mode === "challenge" && challenges.length > 0 && (
         <>
   

  <motion.div
  key={challengeIndex}
  style={{
   maxWidth: "440px",
width: "calc(100% - 40px)",
marginLeft: "auto",
marginRight: "auto",
    marginTop: "20px",
    border: "2px solid #16a34a",
    borderRadius: "12px",
    padding: "20px",
    background: "#ffffff",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
    touchAction: "none",
  }}
  drag="y"
  dragElastic={0.1}
  dragMomentum={false}
  dragConstraints={{ top: -10, bottom: 80 }}
  onDragEnd={handleSwipeEnd}
  initial={{ y: 300, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -300, opacity: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
    

    <div style={{ textAlign: "center" }}>
      <h2>{challenges[challengeIndex]?.hook}</h2>

      <p>{challenges[challengeIndex]?.context}</p>

      <p style={{ fontWeight: "bold", marginTop: "10px" }}>
        {challenges[challengeIndex]?.question}
      </p>

     
<div style={{ marginTop: "20px" }}>
  <p style={{ fontWeight: "bold" }}>
  Score: {score} | Streak: {streak}
</p>

  {currentOptions.map((option: string, index: number) => (
    <button
      key={index}
      onClick={() => {
  if (showResult) return;

  const isCorrect = index === challenges[challengeIndex]?.correctIndex;

  if (isCorrect) {
    setScore((prev) => prev + 1);
    setStreak((prev) => prev + 1);
  } else {
    setStreak(0);
  }

  setSelectedOption(index);
  setShowResult(true);
}}
      style={{
        display: "block",
        width: "100%",
        marginBottom: "10px",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        background:
  showResult && index === challenges[challengeIndex]?.correctIndex
    ? "#c8f7c5"
    : showResult && selectedOption === index
    ? "#f7c5c5"
    : "#fff",
        cursor: "pointer",
      }}
    >
      {option}
    </button>
  ))}

  {showResult && (
    <button
      onClick={() => {
        setShowResult(false);
        setSelectedOption(null);
        setChallengeIndex((prev) => prev + 1);
      }}
      style={{
        marginTop: "20px",
        padding: "10px 16px",
        borderRadius: "8px",
        background: "#2563eb",
        color: "white",
        border: "none",
      }}
    >
      Next
    </button>
  )}
</div>
</div>
  </motion.div>
</>
)}


        {mode === "flashcards" && flashcards.length > 0 && !isSessionComplete && !isOutdated && (
        <>
        
        
          {/* CARD */}
          {/* CARD */}
<div
  style={{
    width: "100%",
    //display: "flex",
   // justifyContent: "center",
    marginTop: "20px",
    marginBottom: "50px",
    
  }}
>
  <div style={{ width: "100%",   margin: "0 auto",  }}>
   

<motion.div
  onClick={() => setFlipped(!flipped)}
  style={{
    width: "90%",
    height: "200px",
    marginTop: "20px",
    cursor: "pointer",
    position: "relative",
    
  }}
>
  {/* FRONT */}
  <motion.div
    animate={{
      rotateY: flipped ? 180 : 0,
      opacity: flipped ? 0 : 1,
    }}
    transition={{ duration: 0.4 }}
    style={{
      position: "absolute",
      width: "100%",
      height: "100%",
      background: "#e5e5e5",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
     // padding: "20px",
      padding: "40px 20px 20px 20px",
      textAlign: "center",
      backfaceVisibility: "hidden",
      overflowY: "auto",
      
    }}
  >
    <div style={{ fontSize: "18px", fontWeight: "600" ,}}>
      {currentCard?.question}
    </div>
  </motion.div>

  {/* BACK */}
  <motion.div
    animate={{
      rotateY: flipped ? 0 : -180,
      opacity: flipped ? 1 : 0,
    }}
    transition={{ duration: 0.4 }}
    style={{
      position: "absolute",
      width: "100%",
      height: "100%",
      background: "#dbeafe",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      //padding: "20px",
      padding: "40px 20px 20px 20px",
      textAlign: "center",
      backfaceVisibility: "hidden",
      overflowY: "auto",
    }}
  >
    <div style={{ fontSize: "18px", fontWeight: "600" }}>
      {currentCard?.answer}
    </div>
  </motion.div>
  

{currentCard?.known && (
  <div
    style={{
      position: "absolute",
      top: "5px",
      right: "-30px",
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      background: "#22c55e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "14px",
      fontWeight: "bold",
      zIndex: 10,
    }}
  >
    ✓
  </div>
)}


</motion.div>

  </div>
</div>
          {/* STATS */}
          
<div
  style={{
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "10px",
    position: "relative",
  }}
>
  <motion.div
  initial={{ opacity: 0, y: 6, scale: 0.95 }}
  animate={{
    opacity: showFeedback ? 1 : 0,
    y: showFeedback ? 0 : -4,
    scale: showFeedback ? 1 : 0.98,
  }}
  transition={{
    duration: 0.5,
    ease: "easeOut",
  }}
  style={{
    fontWeight: "600",
    color: showFeedback === "known" ? "#16a34a" : "#ef4444",
  }}
>
  {showFeedback === "known"
    ? "🔥 Nice!"
    : showFeedback === "unknown"
    ? "↺ Keep practicing"
    : ""}
</motion.div>
</div>

  
          {/* ACTION */}
          {flipped && (
  <div
    style={{
      marginTop: "20px",
      display: "flex",
      justifyContent: "center",
    }}
  >
    <button
    onClick={handleMarkCard}
    
             
      style={{
        padding: "12px 18px",
        borderRadius: "10px",
        border: "none",
        background: currentCard?.known ? "#ef4444" : "#22c55e",
        color: "white",
        cursor: "pointer",
        width: "90%",
        maxWidth: "320px",
        textAlign: "center",
      }}
    >
      {currentCard?.known ? "✕ Mark as difficult" : "✓ I know this"}
    </button>
  </div>
)}

          {/* NAV */}
<div
  style={{
    marginTop: "70px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  }}
>
  {/* CARD PROGRESS */}
  <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>
     Card {currentIndex + 1} / {phaseTotal}
  </div>

  {/* STREAK */}
  <div
    style={{
      display: "flex",
      gap: "20px",
      fontSize: "14px",
      fontWeight: "500",
    }}
  >
    <div
      style={{
        background: "#f3f4f6",
        padding: "8px 12px",
        borderRadius: "10px",
      }}
    >
      🔥 Streak: <strong>{streak}</strong>
    </div>

    <div
      style={{
        background: "#f3f4f6",
        padding: "8px 12px",
        borderRadius: "10px",
      }}
    >
      🏆 Best: <strong>{bestStreak}</strong>
    </div>
  </div>

  {/* BUTTONS */}
  <div style={{ display: "flex", gap: "10px" }}>
    <button onClick={goPrev}>Prev</button>
    <button onClick={goNext}>
      {currentIndex === activeCards.length - 1 ? "Finish" : "Next"}
    </button>
  </div>
</div>
        </>
      )}

      {/* COMPLETE */}
      {mode === "flashcards" && isSessionComplete && flashcards.length > 0 && (
  <div style={{ marginTop: "40px", textAlign: "center" }}>
    <button onClick={resetMode} style={{ marginBottom: "20px" }}>
  ← Back to study modes
</button>
    <h2>🎉 Session Complete!</h2>

{allMastered ? (
  <p>You’ve mastered all flashcards.</p>
) : (
  <p>You’ve reviewed all cards.</p>
)}
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
      onClick={restart}
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
@keyframes fadeOut {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
}
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .note-content :global(p) {
    margin-bottom: 10px;
  }

  .note-content :global(ul) {
    padding-left: 20px;
    margin-bottom: 10px;
  }

  .note-content :global(li) {
    margin-bottom: 6px;
  }

  .note-content :global(h1),
  .note-content :global(h2),
  .note-content :global(h3) {
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 6px;
  }

  .note-content :global(strong) {
    font-weight: 600;
  }
`}</style>
</div>
{showConfetti && (
  <div
    style={{
      position: "fixed",
      bottom: "120px",
      right: "90px",
      width: "80px",
      height: "80px",
      pointerEvents: "none",
      zIndex: 99999,
    }}
  >
    {/* 🎉 Cone */}
    <div
      style={{
        position: "absolute",
        bottom: "0",
        left: "0",
        fontSize: "28px",
      }}
    >
      🎉
    </div>

    {/* Confetti particles */}
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: "6px",
          height: "6px",
          background: ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444"][i % 4],
          borderRadius: "2px",
          left: "20px",
          bottom: "20px",
          animation: `confetti-burst-${i} 0.8s ease-out forwards`,
        }}
      />
    ))}

    <style>
      {`
        ${[...Array(12)]
          .map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const x = Math.cos(angle) * 40;
            const y = Math.sin(angle) * 40;

            return `
              @keyframes confetti-burst-${i} {
                0% {
                  transform: translate(0px, 0px);
                  opacity: 1;
                }
                100% {
                  transform: translate(${x}px, ${-y}px);
                  opacity: 0;
                }
              }
            `;
          })
          .join("")}
      `}
    </style>
  </div>
)}


<Mascot
  mood={mascotMood}
  tired={mistakeCount >= 3}
/>
<BottomNav
  onAdd={() => {
    const deckId = searchParams.get("deckId") || "";
    router.push(`/editor?deckId=${deckId}`);
  }}
/>
</div>
//</main>
);
}
export default function StudyPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudyPage />
    </Suspense>
  );
}