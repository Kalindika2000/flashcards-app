import React from "react";

export function highlightText(
  text: string,
  keywords: string[],
): React.ReactNode[] {
  if (!text || !keywords?.length) return [text];

  const normalizedKeywords = Array.from(
    new Set(
      keywords
        .map((k) => k?.trim())
        .filter((k): k is string => Boolean(k))
        .sort((a, b) => b.length - a.length),
    ),
  );

  if (normalizedKeywords.length === 0) return [text];

  const escapedKeywords = normalizedKeywords.map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );

  const regex = new RegExp(`(${escapedKeywords.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    regex.lastIndex = 0;
    const isMatch = regex.test(part);

    if (isMatch) {
      return (
        <span
          key={index}
          style={{
            backgroundColor: "#fff3cd",
            padding: "0 2px",
            borderRadius: "3px",
          }}
        >
          {part}
        </span>
      );
    }

    return part;
  });
}
