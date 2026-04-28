export async function structureNoteContent(input: string): Promise<string> {
  const response = await fetch("/api/ai/structure-note", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: input }),
  });

  if (!response.ok) {
    throw new Error("Failed to structure note content");
  }

  const data = (await response.json()) as { result?: unknown };
  if (typeof data.result !== "string" || !data.result.trim()) {
    throw new Error("Failed to structure note content");
  }
  return data.result.trim();
}
