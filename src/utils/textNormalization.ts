const IGNORED_WORDS = new Set([
  "the", "a", "an", "to", "at", "in", "on", "of", "for", "with", "by",
  "from", "as", "and", "or",
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "a", "en", "para", "con", "por",
]);

/**
 * Normalizes a string for answer comparison: lowercase, removes accents and,
 * when ignoreArticles is enabled, drops function words comparing token by token.
 */
export function normalizeAnswer(s: string, ignoreArticles = false): string {
  const normalized = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-–—]+/g, ' ')
    .replace(/[^\w\s]/gi, "");

  if (!ignoreArticles) return normalized;

  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0 && !IGNORED_WORDS.has(token))
    .join(" ");
}