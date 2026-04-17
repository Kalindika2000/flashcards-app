import { NextResponse } from "next/server";
const generateAIDistractors = async (
  question: string,
  answer: string,
  difficulty: string
) => {
  try {
    const prompt = `You are creating multiple choice distractors for a quiz.

Question: ${question}
Correct Answer: ${answer}
Difficulty: ${difficulty}

Generate exactly 3 incorrect but plausible answers.

RULES:
- Same topic/domain
- Similar wording style
- Must be incorrect

DIFFICULTY GUIDE:
- easy → clearly wrong answers
- medium → somewhat close answers
- hard → very close / easily confused answers

No vague answers. No explanations.

Return ONLY JSON:
["option1","option2","option3"]`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) return null;

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);

    if (!Array.isArray(parsed) || parsed.length !== 3) return null;

    return parsed;
  } catch (err) {
    console.error("AI distractor error:", err);
    return null;
  }
};
const generateOptions = (answer: string) => {
  let options: string[] = [];

  // ---------- NUMERIC ----------
  if (/^\s*[\d.]+/.test(answer)) {
    // % case
    if (answer.includes("%")) {
      const parsed = parseFloat(answer);

      if (isNaN(parsed)) {
        options = [
          answer,
          "Monthly",
          "Annually",
          "Only when requested",
        ];
      } else {
        const num = Math.round(parsed);
        options = [`${num}%`, `${num - 1}%`, `${num + 1}%`, `${num + 2}%`];
      }
    }

    // $ case
    else if (answer.includes("$")) {
      const num = Math.round(
        parseFloat(answer.replace(/[^0-9.]/g, ""))
      );
      options = [`$${num}`, `$${num - 100}`, `$${num + 100}`, `$${num + 200}`];
    }

    // plain number
    else {
      const parsed = parseFloat(answer);

      if (isNaN(parsed)) {
        options = [
          answer,
          "It depends on the employer",
          "It is optional",
          "It only applies in special cases",
        ];
      } else {
        const num = Math.round(parsed);
        options = [`${num}`, `${num - 1}`, `${num + 1}`, `${num + 2}`];
      }
    }
  }

  // ---------- CONCEPT ----------
  else {
  const lower = answer.toLowerCase();

  // TIME / FREQUENCY
  if (lower.includes("quarter")) {
    options = [
      answer,
      "Monthly",
      "Annually",
      "Every two years",
    ];
  }

  // DATES / YEARS
  else if (
    lower.includes("year") ||
    lower.includes("july") ||
    /\d{4}/.test(answer)
  ) {
    options = [
      answer,
      "From January 2024",
      "From July 2024",
      "From January 2026",
    ];
  }

  // CONTRIBUTION TYPES
  else if (lower.includes("contribution")) {
    options = [
      answer,
      "Employer-matched contributions only",
      "Government-funded contributions",
      "Mandatory deductions only",
    ];
  }

  // ACCOUNT / FUND BEHAVIOUR
  else if (lower.includes("stay") || lower.includes("fund")) {
    options = [
      answer,
      "It resets with each new employer",
      "It is controlled entirely by your employer",
      "It automatically merges into a default fund",
    ];
  }

  // DEFAULT
  else {
    options = [
      answer,
      "It depends on your employer",
      "It is optional in most cases",
      "It only applies under specific conditions",
    ];
  }
}

  // ---------- SHUFFLE ----------
  const shuffled = options.sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(answer);

  return { options: shuffled, correctIndex };
};


export async function POST(req: Request) {
  try {
    const { notes, difficulty = "medium" } = await req.json();

    const prompt = `Generate 3 short challenge clips from these notes:

${notes}

Return JSON in this format:
{
  "challenges": [
    {
      "hook": "...",
      "context": "...",
      "question": "...",
      "answer": "...",
      "explanation": "..."
    }
  ]
}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();

    const text = aiData?.choices?.[0]?.message?.content;

if (!text) {
  return NextResponse.json({ challenges: [] });
}

// 🔍 DEBUG: see raw AI output
console.log("AI RAW:", text);

// ✅ Extract JSON safely (even if extra text exists)
const jsonMatch = text.match(/\{[\s\S]*\}/);

if (!jsonMatch) {
  console.error("No JSON found in AI response");
  return NextResponse.json({ challenges: [] });
}

let parsed;

try {
  parsed = JSON.parse(jsonMatch[0]);
} catch (e) {
  console.error("JSON parse failed:", jsonMatch[0]);
  return NextResponse.json({ challenges: [] });
}

    const enhancedChallenges = await Promise.all(
  parsed.challenges.map(async (c: any) => {
    const aiDistractors = await generateAIDistractors(
  c.question,
  c.answer,
  difficulty
);

    let options: string[];
    let correctIndex: number;

    if (aiDistractors) {
      options = [c.answer, ...aiDistractors];
      options = options.sort(() => Math.random() - 0.5);
      correctIndex = options.indexOf(c.answer);
    } else {
      if (difficulty === "easy") {
  options = [c.answer, "Wrong answer", "Incorrect", "Not correct"];
} else if (difficulty === "hard") {
  options = [c.answer, "Very similar option", "Close answer", "Subtle variation"];
} else {
  options = [c.answer, "Option A", "Option B", "Option C"];
}

options = options.sort(() => Math.random() - 0.5);
correctIndex = options.indexOf(c.answer);
    }

    return {
      ...c,
      options,
      correctIndex,
    };
  })
);

return NextResponse.json({ challenges: enhancedChallenges });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ challenges: [] });
  }
}