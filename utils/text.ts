export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
