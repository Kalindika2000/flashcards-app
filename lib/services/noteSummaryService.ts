export async function fetchNoteSummary(noteHtml: string): Promise<string> {
  const res = await fetch("/api/summarize-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noteContent: noteHtml }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; summary?: string };

  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : "Summarization failed",
    );
  }

  if (typeof data.summary !== "string" || !data.summary.trim()) {
    throw new Error("Empty summary");
  }

  return data.summary.trim();
}
