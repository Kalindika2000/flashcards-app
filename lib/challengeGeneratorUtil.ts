export type Challenge = {
  hook: string;
  context: string;
  question: string;
  answer: string;
  explanation: string;
};

export const generateChallengeClips = async (notes: string): Promise<Challenge[]> => {
  try {
    const response = await fetch("/api/generate-challenges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes }),
    });

    const data = await response.json();
    return data.challenges || [];
  } catch (err) {
    console.error("Error generating challenges:", err);
    return [];
  }
};