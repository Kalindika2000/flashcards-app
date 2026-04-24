"use client";

import { LoadingRow } from "@/components/ui/LoadingRow";

/** Shown while challenge questions are being generated (AI + formatting). */
export default function ChallengeQuestionsLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[440px] px-5 py-8"
      style={{ width: "calc(100% - 40px)" }}
    >
      <div
        className="mb-4 flex justify-center"
        role="status"
        aria-live="polite"
      >
        <LoadingRow text="Preparing challenge..." />
      </div>
      <div
        className="rounded-xl border-2 border-green-600/30 bg-white p-5 shadow-md"
        style={{ minHeight: "200px" }}
      >
        <div className="mb-4 h-4 w-4/5 max-w-[85%] animate-pulse rounded bg-gray-200" />
        <div className="mb-3 h-14 w-full animate-pulse rounded-lg bg-gray-100" />
        <div className="mb-3 h-14 w-full animate-pulse rounded-lg bg-gray-100" />
        <div className="h-14 w-full animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}
