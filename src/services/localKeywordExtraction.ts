import type { ExtractedKeyword, KeywordExtractionOptions, KeywordExtractionResult } from '../types/keyword-extraction';
import { getStopwords } from './stopwords';

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[-–—]+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const splitIntoSentences = (text: string): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length >= 3) {
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 1);
  }
  const lines = text.split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 1);
  if (lines.length >= 3) {
    return lines;
  }
  if (sentences) {
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 1);
  }
  const altSentences = text.match(/[^.!?]+[.!?]?/g);
  if (altSentences) {
    return altSentences
      .map(s => s.trim())
      .filter(s => s.length > 1);
  }
  return lines;
};

// Combined stopwords for backward compatibility (used by tests and when no language specified)
import { STOPWORDS_ES } from './stopwords/es';
import { STOPWORDS_EN } from './stopwords/en';
const DEFAULT_STOPWORDS = new Set([...STOPWORDS_ES, ...STOPWORDS_EN]);

const LEADING_ARTICLES = new Set(['the', 'a', 'an', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas']);

const tokenize = (text: string): string[] =>
  normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !DEFAULT_STOPWORDS.has(token));

const tokenizeKeepStopwords = (text: string): string[] =>
  normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);

const isStopword = (token: string): boolean => DEFAULT_STOPWORDS.has(token);

const createStopwordsFunctions = (stopwords: Set<string>) => {
  const isStopword = (token: string): boolean => stopwords.has(token);

  const tokenize = (text: string): string[] =>
    normalizeText(text)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1 && !stopwords.has(token));

  const tokenizeKeepStopwords = (text: string): string[] =>
    normalizeText(text)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1);

  const passesHardFilters = (term: string, tokens: string[], isSentenceStart: boolean): boolean => {
    if (term.length < 3) return false;
    if (tokens.length === 1 && stopwords.has(tokens[0])) return false;
    if (tokens.length > 1 && stopwords.has(tokens[0]) && !LEADING_ARTICLES.has(tokens[0])) return false;
    if (tokens.length > 1 && stopwords.has(tokens[0]) && LEADING_ARTICLES.has(tokens[0])) {
      if (!isSentenceStart) return false;
      const contentWords = tokens.filter(t => !stopwords.has(t));
      if (contentWords.length < 2) return false;
    }
    if (tokens.length > 1 && tokens.every(t => stopwords.has(t))) return false;
    const contentWords = tokens.filter(t => !stopwords.has(t));
    if (contentWords.length === 0) return false;
    return true;
  };

  const boostScore = (score: number, _term: string, tokens: string[], frequency: number): number => {
    let boosted = score;
    if (frequency > 1) {
      boosted += 0.1 * (frequency - 1);
    }
    const contentWords = tokens.filter(t => !stopwords.has(t));
    const density = contentWords.length / tokens.length;
    boosted += density * 0.05;
    if (tokens.length >= 3 && tokens.length <= 4) {
      boosted += 0.02;
    }
    return boosted;
  };

  const tokenOverlap = (tokens1: string[], tokens2: string[]): number => {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = [...set1].filter(x => set2.has(x)).length;
    const union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0;
  };

  const deduplicateOverlapping = (
    keywords: ExtractedKeyword[]
  ): ExtractedKeyword[] => {
    const sorted = [...keywords].sort((a, b) => b.score - a.score);
    const result: ExtractedKeyword[] = [];
    const seen = new Set<string>();

    for (const kw of sorted) {
      const normalized = kw.term.toLowerCase();
      const kwTokens = normalized.split(' ');
      let shouldSkip = false;
      for (const existing of result) {
        const existingNorm = existing.term.toLowerCase();
        if (existingNorm.includes(normalized)) {
          shouldSkip = true;
          break;
        }
        const existingTokens = existingNorm.split(' ');
        const overlap = tokenOverlap(kwTokens, existingTokens);
        if (overlap >= 0.5) {
          shouldSkip = true;
          break;
        }
      }
      if (!shouldSkip && !seen.has(normalized)) {
        seen.add(normalized);
        result.push(kw);
      }
    }

    return result;
  };

  return {
    tokenize,
    tokenizeKeepStopwords,
    passesHardFilters,
    boostScore,
    deduplicateOverlapping,
    tokenOverlap,
    isStopword: (token: string) => stopwords.has(token),
  };
};

const generateNgrams = (tokens: string[], minN: number, maxN: number): Array<{term: string; isSentenceStart: boolean}> => {
  const ngrams: Array<{term: string; isSentenceStart: boolean}> = [];
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push({
        term: tokens.slice(i, i + n).join(' '),
        isSentenceStart: i === 0
      });
    }
  }
  return ngrams;
};

const buildTermFrequency = (ngrams: Array<{term: string; isSentenceStart: boolean}>, documentFrequency: Map<string, number>): Map<string, {count: number; isSentenceStart: boolean}> => {
  const frequencies = new Map<string, {count: number; isSentenceStart: boolean}>();
  const seen = new Set<string>();
  for (const ng of ngrams) {
    const term = ng.term;
    frequencies.set(term, {
      count: (frequencies.get(term)?.count || 0) + 1,
      isSentenceStart: frequencies.get(term)?.isSentenceStart || ng.isSentenceStart
    });
    if (!seen.has(term)) {
      seen.add(term);
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }
  return frequencies;
};

const calculateTfIdfScores = (
  sentences: string[],
  minPhraseLength: number,
  maxPhraseLength: number,
  stopwords: Set<string>
): Map<string, { score: number; frequency: number; contexts: string[]; tokens: string[]; isSentenceStart: boolean }> => {
  const { tokenizeKeepStopwords, passesHardFilters, boostScore } = createStopwordsFunctions(stopwords);

  const tokenized = sentences.map(sentence => {
    const tokens = tokenizeKeepStopwords(sentence);
    return generateNgrams(tokens, minPhraseLength, maxPhraseLength);
  });

  const documentFrequency = new Map<string, number>();
  const termFrequencies = tokenized.map((ngrams) => buildTermFrequency(ngrams, documentFrequency));

  const documentCount = tokenized.length;

  const results = new Map<string, { score: number; frequency: number; contexts: string[]; tokens: string[]; isSentenceStart: boolean }>();

  for (let docIdx = 0; docIdx < documentCount; docIdx++) {
    const frequencies = termFrequencies[docIdx];
    let totalTokens = 0;
    for (const {count} of frequencies.values()) {
      totalTokens += count;
    }
    if (totalTokens === 0) continue;

    const sentence = sentences[docIdx];
    for (const [term, {count, isSentenceStart}] of frequencies.entries()) {
      const tokens = term.split(' ');
      if (!passesHardFilters(term, tokens, isSentenceStart)) continue;

      const tf = count / totalTokens;
      const df = documentFrequency.get(term) || 0;
      const idf = Math.log(documentCount / df) + 1;
      let score = tf * idf;
      score = boostScore(score, term, tokens, count);

      const existing = results.get(term);
      if (existing) {
        existing.score += score;
        existing.frequency += count;
        existing.contexts.push(sentence);
        existing.isSentenceStart = existing.isSentenceStart || isSentenceStart;
      } else {
        results.set(term, { score, frequency: count, contexts: [sentence], tokens, isSentenceStart });
      }
    }
  }

  return results;
};

export async function extractKeywordsLocal(
  text: string,
  options: KeywordExtractionOptions = {}
): Promise<KeywordExtractionResult> {
  const {
    maxKeywords = 30,
    minTermLength = 3,
    language = 'en',
    minPhraseLength = 1,
    maxPhraseLength = 4,
    existingVocabulary = [],
  } = options;

  const trimmedText = text.trim();
  if (trimmedText.length < 50) {
    return { keywords: [], originalText: trimmedText, language };
  }

  const sentences = splitIntoSentences(trimmedText);
  if (sentences.length < 3) {
    return { keywords: [], originalText: trimmedText, language };
  }

  // Get stopwords for the specified language
  const stopwords = getStopwords(language);

  const tfIdfResults = calculateTfIdfScores(sentences, minPhraseLength, maxPhraseLength, stopwords);

  const vocabSet = new Set(existingVocabulary.map(v => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));

  const keywords: ExtractedKeyword[] = [];
  for (const [term, data] of tfIdfResults.entries()) {
    if (term.length < minTermLength) continue;
    const normalized = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const alreadyInVocabulary = vocabSet.has(normalized);
    if (alreadyInVocabulary) continue;
    keywords.push({
      term,
      score: data.score,
      frequency: data.frequency,
      type: term.includes(' ') ? 'phrase' : 'word',
      context: data.contexts[0],
      alreadyInVocabulary: false,
    });
  }

  keywords.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTokens = a.term.split(' ').length;
    const bTokens = b.term.split(' ').length;
    return bTokens - aTokens;
  });

  const { deduplicateOverlapping } = createStopwordsFunctions(stopwords);

  const deduplicated = deduplicateOverlapping(keywords);

  return {
    keywords: deduplicated.slice(0, maxKeywords),
    originalText: trimmedText,
    language,
  };
}

export { normalizeText, splitIntoSentences, tokenize };