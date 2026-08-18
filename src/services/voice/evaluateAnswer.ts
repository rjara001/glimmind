import { calculateSimilarity } from '../../utils/similarity';
import { normalizeText } from '../../utils/text';

const AMBIGUOUS_BAND_RATIO = 0.55;

const IGNORED_WORDS = new Set([
  'the', 'a', 'an', 'to', 'at', 'in', 'on', 'of', 'for', 'with', 'by',
  'from', 'as', 'and', 'or',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'a', 'en', 'para', 'con', 'por',
]);

const PRONUNCIATION_SUGGESTION = 'No te escuché bien. Probá pronunciar más claro o escribí la respuesta.';

export type EvaluationMethod = 'exact' | 'fuzzy' | 'ambiguous';

export interface AnswerEvaluation {
  correct: boolean;
  method: EvaluationMethod;
  similarity: number | null;
  suggestion?: string;
}

export interface EvaluateOptions {
  ignoreArticles?: boolean;
  threshold?: number;
}

function normalizeForComparison(text: string, ignoreArticles: boolean): string {
  const normalized = normalizeText(text).replace(/[^\w\s]/gi, '');
  if (!ignoreArticles) return normalized;

  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0 && !IGNORED_WORDS.has(token))
    .join(' ');
}

export function evaluateAnswer(
  input: string,
  expected: string,
  options: EvaluateOptions = {},
): AnswerEvaluation {
  const threshold = options.threshold ?? 0.95;
  const ignoreArticles = options.ignoreArticles ?? false;

  const normInput = normalizeForComparison(input, ignoreArticles);
  const normExpected = normalizeForComparison(expected, ignoreArticles);

  if (normInput.length === 0) {
    return { correct: false, method: 'fuzzy', similarity: null };
  }

  if (normInput === normExpected) {
    return { correct: true, method: 'exact', similarity: 1 };
  }

  const similarity = calculateSimilarity(normInput, normExpected);

  if (similarity >= threshold) {
    return { correct: true, method: 'fuzzy', similarity };
  }

  const ambiguousThreshold = threshold * AMBIGUOUS_BAND_RATIO;
  if (similarity >= ambiguousThreshold) {
    return {
      correct: false,
      method: 'ambiguous',
      similarity,
      suggestion: PRONUNCIATION_SUGGESTION,
    };
  }

  return { correct: false, method: 'fuzzy', similarity };
}
