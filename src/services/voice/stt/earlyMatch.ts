import { normalizeText } from '../../../utils/text';

export function normalizeForExactMatch(text: string): string {
  return normalizeText(text).replace(/[^\w\s]/gi, '');
}

export function isExactExpectedAnswer(transcript: string, expected: string): boolean {
  return normalizeForExactMatch(transcript) === normalizeForExactMatch(expected);
}
