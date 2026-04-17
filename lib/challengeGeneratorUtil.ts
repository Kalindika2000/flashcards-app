export type Challenge = {
  hook: string;
  context: string;
  question: string;
  answer: string;
  explanation: string;
  options: string[];
  correctIndex: number;
};

export const generateChallengeClips = async (
  notes: string,
  difficulty: string
): Promise<Challenge[]> => {
  try {
    const response = await fetch("/api/generate-challenges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes, difficulty }),
    });

    const data = await response.json();
    return (data.challenges || []).map((c: Challenge) => ({
  ...c,
  options: generateOptions(c.answer),
}));
  } catch (err) {
    console.error("Error generating challenges:", err);
    return [];
  }
};
const generateOptions = (correctAnswer: string): string[] => {
  const options = [correctAnswer];

  if (correctAnswer.includes("%")) {
    const num = parseFloat(correctAnswer);

    options.push(`${num - 1}%`);
    options.push(`${num + 1}%`);
    options.push(`${num + 2}%`);
  } else if (correctAnswer.includes("$")) {
    const num = parseFloat(correctAnswer.replace(/[^0-9.]/g, ""));

    options.push(`$${num - 100}`);
    options.push(`$${num + 100}`);
    options.push(`$${num + 200}`);
  } else {
    options.push(
      "It is controlled by your employer",
      "It resets when you change jobs",
      "It automatically combines accounts"
    );
  }

  return options.sort(() => Math.random() - 0.5);
};