import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitSimulation } from "@/lib/api/rateLimit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SimulationDifficulty = "easy" | "medium" | "hard";
type SimulationScenarioType = "diagnosis" | "intervention" | "explanation";

function parseDifficulty(raw: unknown): SimulationDifficulty {
  return raw === "easy" || raw === "hard" || raw === "medium" ? raw : "medium";
}

function parseScenarioType(raw: unknown): SimulationScenarioType {
  return raw === "diagnosis" || raw === "explanation" || raw === "intervention"
    ? raw
    : "intervention";
}

function parseScenario(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

const SYSTEM_PROMPT = `You are roleplaying as a real person in a scenario (e.g. a patient, client, or parent). The user is a professional trying to understand and help you.

IMPORTANT: You are NOT a teacher, tutor, or assistant. You are the person experiencing the problem.

---

## CORE BEHAVIOR RULES

1. Stay fully in character at all times.

* Speak in first person.
* Use natural, conversational language.
* Do NOT explain concepts like a teacher.

2. You have a specific underlying situation based on hidden facts (provided separately).

* These facts are your ground truth.
* Do NOT invent new facts.
* Do NOT contradict them.

3. Reveal information gradually.

* Do NOT provide all details at once.
* Start vague.
* Only give more detail when the user asks relevant questions.

4. Match the user’s question depth:

* If the user asks vague questions → respond vaguely.
* If the user asks specific questions → provide specific relevant details.
* Never dump all information.

5. Never provide the final answer, diagnosis, or full explanation directly.

* Do NOT summarize the situation completely.
* Do NOT “solve” the problem for the user.

---

## FOCUS AND REDIRECTION

6. If the user says something unrelated to your situation:

* Do NOT follow the new topic.
* Respond briefly (1–2 sentences).
* Gently redirect back to your concern.

Examples:

* "I'm not sure how that relates… I'm still worried about my child."
* "That’s interesting, but I really need help understanding what’s going on."
* "Could we focus on what's been happening with my situation?"

7. Always keep the conversation centered on your problem.

---

## TONE AND STYLE

8. Keep responses:

* Short (1–3 sentences)
* Natural and human
* Slightly emotional when appropriate (e.g. concerned, unsure)

9. Do NOT:

* Use bullet points
* Give structured explanations
* Sound like a textbook or lesson
* Say things like "CBT is a therapy that..."

---

## GOAL OF THE INTERACTION

The user is trying to:

* understand your situation
* identify what is happening
* determine the best way to help

Your role is to:

* provide information only when asked
* make them work to uncover the full picture

---

## CONVERSATION START (VERY IMPORTANT)

If this is the first message in the conversation:

* Start by briefly describing your situation in a natural way
* Be slightly vague (do NOT reveal everything)
* Mention 1–2 key concerns or symptoms only
* End with a question or statement that invites the user to respond

---

## REMEMBER

You are a real person with a problem — not an expert explaining it.

Stay in character. Stay focused. Reveal information gradually.`;

type SimulationMessage = {
  role: "user" | "ai";
  content: string;
};

function toOpenAiRole(role: SimulationMessage["role"]): "user" | "assistant" {
  return role === "ai" ? "assistant" : "user";
}

function formatFlashcards(rawFlashcards: unknown): string | null {
  if (!Array.isArray(rawFlashcards) || rawFlashcards.length === 0) {
    return null;
  }

  const lines = rawFlashcards
    .filter((item): item is { question?: unknown; answer?: unknown } => {
      return Boolean(item && typeof item === "object");
    })
    .map((item) => {
      const question = typeof item.question === "string" ? item.question.trim() : "";
      const answer = typeof item.answer === "string" ? item.answer.trim() : "";
      if (!question || !answer) return "";
      return `Question: ${question}\nAnswer: ${answer}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return null;
  return lines.join("\n\n");
}

function parseMessages(rawMessages: unknown): SimulationMessage[] | null {
  if (!Array.isArray(rawMessages)) return null;

  const parsed: SimulationMessage[] = [];
  for (const m of rawMessages) {
    if (!m || typeof m !== "object") continue;
    const row = m as Record<string, unknown>;
    const role = row.role;
    const content = row.content;
    if ((role !== "user" && role !== "ai") || typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    parsed.push({ role, content: trimmed });
  }
  return parsed;
}

/** POST — body: { flashcards: { question: string, answer: string }[], messages: { role: "user" | "ai", content: string }[] }. Returns { message: string }. */
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
  const difficulty = parseDifficulty(o.difficulty);
  const scenarioType = parseScenarioType(o.scenarioType);
  const scenario = parseScenario(o.scenario);
  const formattedFlashcards = formatFlashcards(o.flashcards);
  if (!formattedFlashcards) {
    return NextResponse.json(
      { error: "flashcards must include question and answer strings" },
      { status: 400 },
    );
  }

  const messages = parseMessages(o.messages);
  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "messages must be a non-empty array" },
      { status: 400 },
    );
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nDifficulty level: ${difficulty}\n\nDifficulty behavior:\n- Easy: be slightly more supportive, offer small hints occasionally, and reveal information a bit more easily.\n- Medium: keep a balanced reveal style.\n- Hard: be more vague, reveal less information, require more specific questioning, and do not offer hints.\n\nScenario type: ${scenarioType}\n\nScenario behavior:\n- diagnosis: the user's goal is to identify the problem/condition; do not suggest solutions; focus on symptoms and observations.\n- intervention: the user's goal is to decide how to help; provide context but not solutions.\n- explanation: the user's goal is to explain something clearly; ask questions that test understanding and occasionally ask for clarification.\n\nScenario context:\n${scenario || "Use the hidden facts to establish a realistic context."}\n\nHidden context:\n${formattedFlashcards}`,
        },
        ...messages.map((m) => ({
          role: toOpenAiRole(m.role),
          content: m.content,
        })),
      ],
    });

    const message = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ message });
  } catch (error) {
    console.error("POST /api/simulation-step:", error);
    return NextResponse.json(
      { error: "Failed to run simulation step" },
      { status: 500 },
    );
  }
}
