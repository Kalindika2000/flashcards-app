import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitSimulation } from "@/lib/api/rateLimit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type EvaluationResult = "correct" | "partial" | "incorrect";
type EvaluationProcess = "good" | "average" | "poor";
type EvaluationCoverage = "high" | "medium" | "low";
type ConversationMessage = { role: "user" | "ai"; content: string };

type EvaluationPayload = {
  answer: EvaluationResult;
  process: EvaluationProcess;
  coverage: EvaluationCoverage;
  feedback: string;
};

const FALLBACK_EVALUATION: EvaluationPayload = {
  answer: "incorrect",
  process: "poor",
  coverage: "low",
  feedback: "Could not evaluate performance. Please try again.",
};

function normalizeEvaluation(raw: unknown): EvaluationPayload {
  if (!raw || typeof raw !== "object") return FALLBACK_EVALUATION;
  const obj = raw as {
    answer?: unknown;
    process?: unknown;
    coverage?: unknown;
    feedback?: unknown;
  };
  const answer =
    obj.answer === "correct" || obj.answer === "partial" || obj.answer === "incorrect"
      ? obj.answer
      : "incorrect";
  const process =
    obj.process === "good" || obj.process === "average" || obj.process === "poor"
      ? obj.process
      : "poor";
  const coverage =
    obj.coverage === "high" || obj.coverage === "medium" || obj.coverage === "low"
      ? obj.coverage
      : "low";
  const feedback =
    typeof obj.feedback === "string" && obj.feedback.trim()
      ? obj.feedback.trim()
      : FALLBACK_EVALUATION.feedback;
  return { answer, process, coverage, feedback };
}

function parseConversation(raw: unknown): ConversationMessage[] {
  if (!Array.isArray(raw)) return [];
  const parsed: ConversationMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const role = row.role;
    const content = row.content;
    if ((role !== "user" && role !== "ai") || typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    parsed.push({ role, content: trimmed });
  }
  return parsed;
}

/** POST — body: { userAnswer: string, correctAnswer: string, supportingFacts: string[], messages: { role: "user" | "ai", content: string }[] }. Returns { answer: "correct" | "partial" | "incorrect", process: "good" | "average" | "poor", coverage: "high" | "medium" | "low", feedback: string }. */
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
  const userAnswer = typeof o.userAnswer === "string" ? o.userAnswer.trim() : "";
  const correctAnswer = typeof o.correctAnswer === "string" ? o.correctAnswer.trim() : "";
  const supportingFacts = Array.isArray(o.supportingFacts)
    ? o.supportingFacts
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  const messages = parseConversation(o.messages);

  if (!userAnswer || !correctAnswer) {
    return NextResponse.json(
      { error: "userAnswer and correctAnswer are required" },
      { status: 400 },
    );
  }

  const systemPrompt = `You are evaluating a student's performance in a roleplay learning simulation.

Evaluate THREE things:

1. ANSWER:

* "correct", "partial", or "incorrect"
* Based on meaning, not exact wording

2. PROCESS:

* "good", "average", or "poor"
* Did the student ask relevant and logical questions?
* Did they explore the problem effectively?

3. COVERAGE:

* "high", "medium", or "low"
* Did the student uncover the key facts needed to solve the problem?

Also provide short feedback (1–2 sentences).

CRITICAL RULES:

* Return ONLY valid JSON
* No extra text
* No markdown
* Must be parseable with JSON.parse

Return EXACTLY:

{
"answer": "correct" | "partial" | "incorrect",
"process": "good" | "average" | "poor",
"coverage": "high" | "medium" | "low",
"feedback": string
}`;

  const conversationText =
    messages.length > 0
      ? messages.map((m) => `${m.role === "ai" ? "AI" : "User"}: ${m.content}`).join("\n")
      : "No conversation provided.";

  const userPrompt = `Final Answer:
${userAnswer}

Correct Answer:
${correctAnswer}

Key Facts:
${supportingFacts.join(", ")}

Conversation:
${conversationText}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = FALLBACK_EVALUATION;
    }

    const normalized = normalizeEvaluation(parsed);
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("POST /api/simulation-evaluate:", error);
    return NextResponse.json(FALLBACK_EVALUATION);
  }
}
