/**
 * Strip HTML / entities to plain text (summaries, Firestore plainText, AI input).
 */
export function noteContentToPlainText(html: string): string {
  if (!html) return "";

  const decoded = html
    .replace(/&nbsp;|&#160;|\u00A0/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

  return decoded
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function looksLikeHtmlFragment(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  return /<\/[a-z][\s\S]*>/i.test(t) || /<br\s*\/?>/i.test(t) || /<[uo]l[\s>]/i.test(t);
}

/**
 * Turn plain / messy line-based text into simple HTML (paragraphs, lists, headings).
 * If `raw` already looks like HTML (e.g. from Quill), returns it unchanged — sanitize at render.
 */
export function formatNoteContent(raw: string): string {
  if (!raw) return "";

  if (looksLikeHtmlFragment(raw)) {
    return raw;
  }

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

    if (/^[-•]\s+/.test(line)) {
      flushParagraph();

      if (!inList) {
        html += "<ul>";
        inList = true;
      }

      html += `<li>${escapeHtml(line.replace(/^[-•]\s+/, ""))}</li>`;
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

    if (
      last &&
      !/[.!?]$/.test(last) &&
      /^[a-z]/.test(line)
    ) {
      buffer[buffer.length - 1] = `${last} ${line}`;
    } else {
      buffer.push(line);
    }
  }

  flushParagraph();

  if (inList) html += "</ul>";

  return html;
}
