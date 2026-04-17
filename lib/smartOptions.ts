export const generateSmartOptions = (correctAnswer: string): {
  options: string[];
  correctIndex: number;
} => {
  let options: string[] = [];

  // ---------- TYPE 1: NUMERIC ----------
  if (/\d/.test(correctAnswer)) {
    if (correctAnswer.includes("%")) {
  const num = Math.round(parseFloat(correctAnswer));

  const cleanCorrect = `${num}%`;

  options = [
    cleanCorrect,
    `${num - 1}%`,
    `${num + 1}%`,
    `${num + 2}%`,
  ];
} else if (correctAnswer.includes("$")) {
      const num = Math.round(parseFloat(correctAnswer.replace(/[^0-9.]/g, "")));

const cleanCorrect = `$${num}`;

options = [
  cleanCorrect,
  `$${num - 100}`,
  `$${num + 100}`,
  `$${num + 200}`,
];
    } else {
      const num = Math.round(parseFloat(correctAnswer));

      options = [
        correctAnswer,
        `${num - 1}`,
        `${num + 1}`,
        `${num + 2}`,
      ];
    }
  }

  // ---------- TYPE 2: FALLBACK (CONCEPTUAL) ----------
  // ---------- TYPE 2: CONCEPTUAL ----------
else {
  const lower = correctAnswer.toLowerCase();

  if (lower.includes("quarter")) {
    options = [
      correctAnswer,
      "Monthly",
      "Annually",
      "Only when requested",
    ];
  } else if (lower.includes("year")) {
    options = [
      correctAnswer,
      "Every month",
      "Every quarter",
      "Only once when hired",
    ];
  } else if (lower.includes("stay") || lower.includes("stays")) {
    options = [
      correctAnswer,
      "It resets each time you change jobs",
      "It is managed by your employer",
      "It automatically merges with other accounts",
    ];
  } else {
    options = [
      correctAnswer,
      "It depends on the employer",
      "It is optional",
      "It only applies in special cases",
    ];
  }
}

  // ---------- CLEAN + SHUFFLE ----------
  const uniqueOptions = Array.from(new Set(options));

  while (uniqueOptions.length < 4) {
    uniqueOptions.push("None of the above");
  }

  const shuffled = uniqueOptions.sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(correctAnswer);

  return {
    options: shuffled,
    correctIndex,
  };
};