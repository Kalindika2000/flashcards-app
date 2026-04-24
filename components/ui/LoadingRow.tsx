"use client";

import { StudyLoadingSpinner } from "@/components/study/StudyLoadingSpinner";

type LoadingRowProps = {
  text: string;
};

export function LoadingRow({ text }: LoadingRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "14px",
        color: "#555",
      }}
    >
      <StudyLoadingSpinner />
      <span>{text}</span>
    </div>
  );
}
