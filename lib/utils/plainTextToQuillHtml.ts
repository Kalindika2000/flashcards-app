/**
 * React Quill expects HTML. Plain newlines are collapsed to spaces inside a
 * single <p>, so PDF (or paste) text must be converted to <p> / <br/> first.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainTextToQuillHtml(plain: string): string {
  const trimmed = plain.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!trimmed) return "";

  const blocks = trimmed.split(/\n\n+/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const inner = lines.map((line) => escapeHtml(line)).join("<br/>");
      return `<p>${inner}</p>`;
    })
    .join("");
}
