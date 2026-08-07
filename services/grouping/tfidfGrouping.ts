import { clusterBySimilarity, GroupSuggestion } from './clustering';
import { MIN_GROUP_SIZE } from '../../constants/limits';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'with',
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a',
  'en', 'con', 'por', 'para', 'que', 'del', 'al', 'se', 'su', 'sus', 'es',
]);

const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const tokenize = (text: string): string[] =>
  normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

const buildTermFrequency = (tokens: string[], documentFrequency: Map<string, number>): Map<string, number> => {
  const frequencies = new Map<string, number>();
  const seen = new Set<string>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
    if (!seen.has(token)) {
      seen.add(token);
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }
  return frequencies;
};

export function tfidfGrouping(items: string[], minGroupSize?: number): GroupSuggestion[] {
  if (items.length < MIN_GROUP_SIZE) {
    return [];
  }

  const tokenized = items.map((item) => tokenize(item));
  const documentFrequency = new Map<string, number>();
  const termFrequencies = tokenized.map((tokens) => buildTermFrequency(tokens, documentFrequency));

  const vocabulary = Array.from(documentFrequency.keys());
  const documentCount = tokenized.length;

  const vectors = termFrequencies.map((frequencies) => {
    const vector = new Array(vocabulary.length).fill(0);
    let totalTokens = 0;
    for (const count of frequencies.values()) {
      totalTokens += count;
    }
    if (totalTokens === 0) return vector;
    for (let v = 0; v < vocabulary.length; v++) {
      const count = frequencies.get(vocabulary[v]) || 0;
      if (count === 0) continue;
      const tf = count / totalTokens;
      const df = documentFrequency.get(vocabulary[v]) || 0;
      const idf = Math.log(documentCount / df) + 1;
      vector[v] = tf * idf;
    }
    return vector;
  });

  return clusterBySimilarity(vectors, items, 0.08, minGroupSize);
}
