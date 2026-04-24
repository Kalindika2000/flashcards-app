"use client";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 16px",
        color: "#666",
      }}
    >
      <div style={{ fontWeight: "600", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "14px" }}>{description}</div>
    </div>
  );
}
