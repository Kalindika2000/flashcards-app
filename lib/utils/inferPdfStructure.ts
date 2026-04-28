/**
 * Infer headings, lists, and paragraphs from extracted PDF plain text
 * and return HTML suitable for Quill / note.content.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inferPdfStructure(raw: string): string {
  if (!raw) return "";

  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let html = "";
  let buffer: string[] = [];
  let inList = false;

  const flushParagraph = () => {
    if (buffer.length === 0) return;
    html += `<p>${escapeHtml(buffer.join(" "))}</p>`;
    buffer = [];
  };

  for (const line of lines) {
    if (/^(healthline|american psychological association|healthdirect)/i.test(line)) {
      continue;
    }

    if (/^[-•]\s+/.test(line)) {
      flushParagraph();

      if (!inList) {
        html += "<ul>";
        inList = true;
      }

      const clean = line.replace(/^[-•]\s+/, "");
      html += `<li>${escapeHtml(clean)}</li>`;
      continue;
    }

    if (/^[A-Za-z ]+:\s+/.test(line)) {
      flushParagraph();

      if (!inList) {
        html += "<ul>";
        inList = true;
      }

      const [label, ...rest] = line.split(":");
      const content = rest.join(":").trim();

      html += `<li><strong>${escapeHtml(label.trim())}:</strong> ${escapeHtml(content)}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    const isLikelyHeading =
      line.length < 80 &&
      /^[A-Z]/.test(line) &&
      !/[.!?]$/.test(line) &&
      !line.includes(":");

    if (isLikelyHeading) {
      flushParagraph();
      html += `<h3>${escapeHtml(line)}</h3>`;
      continue;
    }

    const last = buffer[buffer.length - 1];

    if (last && !/[.!?]$/.test(last) && /^[a-z]/.test(line)) {
      buffer[buffer.length - 1] = `${last} ${line}`;
    } else {
      buffer.push(line);
    }
  }

  flushParagraph();

  if (inList) html += "</ul>";

  return html;
}
