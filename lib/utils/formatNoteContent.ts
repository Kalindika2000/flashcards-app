export function formatNoteContent(html: string): string {
  if (!html) return "";

  const decoded = html
    .replace(/&nbsp;|&#160;|\u00A0/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

  return decoded
    // Convert list items to bullet points
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")

    // Convert unordered/ordered lists to line breaks
    .replace(/<\/ul>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")

    // Convert paragraphs to spacing
    .replace(/<\/p>/gi, "\n\n")

    // Convert line breaks
    .replace(/<br\s*\/?>/gi, "\n")

    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, "")

    // Normalize spacing
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
