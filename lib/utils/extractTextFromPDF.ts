import * as pdfjsLib from "pdfjs-dist/build/pdf";
import "pdfjs-dist/build/pdf.worker.entry";

type LineEntry = { y: number; text: string };

function buildPageText(lines: LineEntry[]): string {
  let text = "";
  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    const next = lines[i + 1];
    text += current.text + "\n";
    if (next) {
      const gap = current.y - next.y;
      if (gap > 15) {
        text += "\n";
      }
    }
  }
  return text;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const items = content.items as Array<{
      str?: string;
      transform?: number[];
    }>;

    type Fragment = { x: number; str: string };
    const lineMap = new Map<number, Fragment[]>();

    items.forEach((item) => {
      const str = item.str;
      if (typeof str !== "string" || !str) return;
      const t = item.transform;
      const y = Math.round(t?.[5] ?? 0);
      const x = t?.[4] ?? 0;

      if (!lineMap.has(y)) {
        lineMap.set(y, []);
      }

      lineMap.get(y)!.push({ x, str });
    });

    const sortedLines = Array.from(lineMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([y, parts]) => ({
        y,
        text: parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .trim(),
      }))
      .filter((line) => line.text.length > 0);

    const pageText = buildPageText(sortedLines);
    if (pageText.trim().length > 0) {
      pageParts.push(pageText.trim());
    }
  }

  return pageParts.join("\n\n").trim();
}
