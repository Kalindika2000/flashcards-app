import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitSimulation } from "@/lib/api/rateLimit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** POST — body: { flashcards: { question: string, answer: string }[], scenarioType: string }. Returns { scenario: string }. */
export async function POST(req: Request) {
  const limited = rateLimitSimulation(req);
  if (limited) return limited;

  const missingKey = requireOpenAiKey();
  if (missingKey) return missingKey;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawFlashcards = o.flashcards;
  const scenarioType =
    typeof o.scenarioType === "string" && o.scenarioType.trim()
      ? o.scenarioType.trim()
      : "intervention";

  if (!Array.isArray(rawFlashcards) || rawFlashcards.length === 0) {
    return NextResponse.json(
      { error: "flashcards must be a non-empty array" },
      { status: 400 },
    );
  }

  const keyAnswers = rawFlashcards
    .filter((item): item is { answer?: unknown } => Boolean(item && typeof item === "object"))
    .map((item) => (typeof item.answer === "string" ? item.answer.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);

  if (keyAnswers.length === 0) {
    return NextResponse.json(
      { error: "flashcards must include answer strings" },
      { status: 400 },
    );
  }

  const systemPrompt = `You are generating a realistic scenario for a learning simulation.

Use the provided concepts to create a unique situation.

Requirements:

* Create a realistic, specific situation
* Vary context (home, school, social, etc.)
* Do NOT copy previous phrasing
* Keep it concise (2–3 sentences)
* Do NOT explain concepts
* Do NOT give answers

Return ONLY plain text.`;

  const userPrompt = `Scenario Type:
${scenarioType}

Key flashcard answers:
${keyAnswers.join(", ")}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const scenario = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ scenario });
  } catch (error) {
    console.error("POST /api/simulation-generate-scenario:", error);
    return NextResponse.json(
      { error: "Failed to generate scenario" },
      { status: 500 },
    );
  }
}
