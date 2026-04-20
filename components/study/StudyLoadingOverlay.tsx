"use client";

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
      <div className="study-loading-spinner" aria-hidden />
      <p style={{ marginTop: "12px", color: "#333", fontWeight: "500" }}>
        {loadingMessage}
      </p>
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
    </div>
  );
}
