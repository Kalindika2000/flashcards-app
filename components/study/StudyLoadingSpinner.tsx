"use client";

/** Spinner markup + styles shared by study loading overlay and inline loading rows. */
export function StudyLoadingSpinner() {
  return (
    <>
      <div className="study-loading-spinner" aria-hidden />
      <style jsx>{`
        .study-loading-spinner {
          margin: 0 auto;
          width: 32px;
          height: 32px;
          border: 4px solid #ddd;
          border-top: 4px solid #2563eb;
          border-radius: 50%;
          animation: study-loading-spin 0.9s linear infinite;
        }
        @keyframes study-loading-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
