"use client";

import { useRouter, useSearchParams } from "next/navigation";
import StudyPageHeader from "@/components/study/StudyPageHeader";
import SimulationSession from "@/components/study/SimulationSession";

export default function SimulationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("noteId") ?? "";
  const deckId = searchParams.get("deckId") ?? "";

  const handleBackToStudyModes = () => {
    const params = new URLSearchParams();
    if (noteId.trim()) params.set("noteId", noteId.trim());
    if (deckId.trim()) params.set("deckId", deckId.trim());
    const query = params.toString();
    router.push(query ? `/study?${query}` : "/study");
  };

  return (
    <div className="app-container" style={{ minHeight: "100vh" }}>
      <StudyPageHeader onBack={handleBackToStudyModes} />
      <div style={{ padding: "20px" }}>
        <SimulationSession noteId={noteId} onBackToStudyModes={handleBackToStudyModes} />
      </div>
    </div>
  );
}
