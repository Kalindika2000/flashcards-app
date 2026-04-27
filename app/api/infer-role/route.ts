import { NextResponse } from "next/server";
import OpenAI from "openai";
import { MAX_NOTES_LENGTH, requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitInferRole } from "@/lib/api/rateLimit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are identifying the most appropriate professional role based on study material.

Rules:

* Return a SPECIFIC professional role (e.g. 'Child Psychologist', 'Tax Accountant', 'Corporate Lawyer')
* Prefer specialization when possible (not generic roles like 'Psychologist' if more specific context exists)
* Keep it concise (2–4 words max)
* Do NOT explain
* Do NOT include punctuation
* Do NOT include extra text

Return ONLY the role title as plain text.`;

function normalizeRole(raw: string): string {
  const firstLine = raw.split(/\r?\n/)[0]?.trim() ?? "";
  const noQuotes = firstLine.replace(/^["']|["']$/g, "").trim();
  return noQuotes;
}

function isValidRole(role: string): boolean {
  if (!role) return false;
  if (role.length > 80) return false;
  return true;
}

export async function POST(req: Request) {
  const limited = rateLimitInferRole(req);
  if (limited) return limited;

  const missingKey = requireOpenAiKey();
  if (missingKey) return missingKey;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const noteContent = (body as { noteContent?: unknown }).noteContent;
  if (typeof noteContent !== "string") {
    return NextResponse.json(
      { error: 'Field "noteContent" must be a string' },
      { status: 400 },
    );
  }

  const trimmed = noteContent.trim();
  if (!trimmed) {
    return NextResponse.json({ role: "Professional" });
  }

  if (trimmed.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `noteContent must be at most ${MAX_NOTES_LENGTH} characters` },
      { status: 413 },
    );
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Note Content:\n${trimmed}` },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    const candidate = normalizeRole(typeof text === "string" ? text : "");
    const role = isValidRole(candidate) ? candidate : "Professional";

    return NextResponse.json({ role });
  } catch {
    return NextResponse.json(
      { error: "Failed to infer role" },
      { status: 500 },
    );
  }
}
