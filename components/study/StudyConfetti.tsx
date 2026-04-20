"use client";

export default function StudyConfetti() {
  return (
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
                0% { transform: translate(0px, 0px); opacity: 1; }
                100% { transform: translate(${x}px, ${-y}px); opacity: 0; }
              }
            `;
          })
          .join("")}
      `}
      </style>
    </div>
  );
}
