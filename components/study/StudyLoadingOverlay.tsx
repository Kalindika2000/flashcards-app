"use client";

import { LoadingRow } from "@/components/ui/LoadingRow";

export { StudyLoadingSpinner } from "@/components/study/StudyLoadingSpinner";

type StudyLoadingOverlayProps = {
  loadingMessage: string;
};

export default function StudyLoadingOverlay({
  loadingMessage,
}: StudyLoadingOverlayProps) {
  return (
    <div
      className="study-loading-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(255,255,255,0.85)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999,
      }}
    >
      <LoadingRow text={loadingMessage} />
    </div>
  );
}
