import { NextResponse } from "next/server";
import OpenAI from "openai";

type HintPayload = {
  question?: string;
  correctAnswer?: string;
  answer?: string;
  distractors?: string[];
};

function sanitizeHints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function hasVerbLikeWord(s: string): boolean {
  const lowered = s.toLowerCase();
  if (/\b(is|are|was|were|be|being|been|has|have|had|does|do|did|can|could|will|would|should|may|might|must)\b/.test(lowered)) {
    return true;
  }
  return /\b[a-z]{3,}(ed|ing)\b/.test(lowered);
}

function tooSimilar(a: string, b: string): boolean {
  const aSet = new Set(a.toLowerCase().split(/\W+/).filter((x) => x.length > 2));
  const bSet = new Set(b.toLowerCase().split(/\W+/).filter((x) => x.length > 2));
  if (aSet.size === 0 || bSet.size === 0) return false;
  let inter = 0;
  for (const w of aSet) {
    if (bSet.has(w)) inter += 1;
  }
  const union = new Set([...aSet, ...bSet]).size;
  return union > 0 ? inter / union >= 0.8 : false;
}

function isValidHints(hints: string[]): boolean {
  if (!Array.isArray(hints) || hints.length !== 4) return false;
  const banned = ["focus on", "think about", "consider"];
  for (const hint of hints) {
    const h = hint.trim();
    if (wordCount(h) < 8) return false;
    if (banned.some((b) => h.toLowerCase().includes(b))) return false;
    if (!hasVerbLikeWord(h)) return false;
  }
  for (let i = 0; i < hints.length; i += 1) {
    for (let j = i + 1; j < hints.length; j += 1) {
      if (tooSimilar(hints[i]!, hints[j]!)) return false;
    }
  }
  return true;
}

async function generateHintsFromOpenAI(
  question: string,
  correctAnswer: string,
  distractors: string[],
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const client = new OpenAI({ apiKey });

  console.log("Calling OpenAI...");
  const prompt = `
You are an expert teacher helping a student understand a concept deeply.

Your task:
Generate 4 progressively helpful hints that guide the student to the correct answer.

---

INPUT:

Question:
${question}

Correct Answer:
${correctAnswer}

Incorrect Options (common mistakes):
${distractors.join(", ")}

---

THINKING PROCESS (DO NOT OUTPUT THIS):

1. Identify the core concept being tested
2. Identify the key idea that distinguishes the correct answer from incorrect ones
3. Identify common misconceptions from the incorrect options
4. Plan a progression:
   - Hint 1: Broad conceptual direction
   - Hint 2: Narrow the idea
   - Hint 3: Key mechanism or distinguishing feature
   - Hint 4: Almost the answer (but not identical)

---

STRICT RULES:

1. Each hint must be a COMPLETE, NATURAL sentence
2. Each hint must ADD NEW INFORMATION (no repetition)
3. Each hint must contain MEANINGFUL CONTENT from the answer
4. DO NOT use vague phrases:
   - "focus on"
   - "think about"
   - "consider"
   - "it relates to"
5. DO NOT use single words or fragments
6. DO NOT repeat the question wording
7. Use the incorrect options to eliminate misconceptions where useful
8. Hints must sound like a HUMAN TEACHER explaining, not a keyword extractor
9. Each hint must reduce uncertainty and move closer to the answer
10. The final hint can be very close to the answer but not identical

---

QUALITY STANDARD:

If the hints would not genuinely help a student figure out the answer,
they are NOT acceptable.

---

GOOD EXAMPLE:

Question: What is superannuation in Australia?
Answer: A compulsory system where money is set aside during working life for retirement.

Hints:
1. This is a system in Australia designed to provide financial support after people stop working.
2. It involves regularly setting aside money while a person is employed.
3. The system is mandatory and ensures long-term savings accumulate over time.
4. It builds funds throughout a career to provide income during retirement.

---

BAD EXAMPLES (NEVER DO THIS):

- "Focus on retirement"
- "Think about money"
- "It relates to savings"
- "Retirement system"
- "Super"

---

FINAL STEP (SELF-CHECK BEFORE OUTPUT):

Ensure:
- All 4 hints are distinct
- Each hint is at least 10 words
- No hint contains banned phrases
- Each hint clearly improves understanding

---

OUTPUT FORMAT (STRICT JSON ONLY):

{
  "hints": [
    "Hint 1...",
    "Hint 2...",
    "Hint 3...",
    "Hint 4..."
  ]
}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert tutor who gives clear, helpful study hints.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });
  console.log("OpenAI response:", completion);

  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned empty response");
  }
  console.log("Raw AI text:", content);

  const parsed = JSON.parse(content) as { hints?: unknown };

  if (!parsed.hints || !Array.isArray(parsed.hints)) {
    throw new Error("Invalid hints format from OpenAI");
  }
  return sanitizeHints(parsed.hints);
}

export async function POST(req: Request) {
  try {
    console.log("=== HINT API CALLED ===");
    const body = (await req.json()) as HintPayload;
    console.log("Request body:", body);
    const question = body.question?.trim() ?? "";
    const correctAnswer = (body.correctAnswer ?? body.answer)?.trim() ?? "";
    const distractors = Array.isArray(body.distractors)
      ? body.distractors
          .map((d) => (typeof d === "string" ? d.trim() : ""))
          .filter(Boolean)
      : [];

    if (!question || !correctAnswer) {
      return NextResponse.json(
        { error: "question and correctAnswer are required" },
        { status: 400 },
      );
    }

    let aiHints = await generateHintsFromOpenAI(question, correctAnswer, distractors);
    if (!isValidHints(aiHints)) {
      aiHints = await generateHintsFromOpenAI(question, correctAnswer, distractors);
    }
    if (!isValidHints(aiHints)) {
      return NextResponse.json(
        { error: "AI hint generation returned invalid hints" },
        { status: 502 },
      );
    }

    return NextResponse.json({ hints: aiHints });
  } catch (error: any) {
    console.error("❌ HINT API ERROR (FULL):");

    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    } else {
      console.error("Raw error:", error);
    }

    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

