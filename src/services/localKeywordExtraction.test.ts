import { describe, it, expect } from 'vitest';
import { extractKeywordsLocal, splitIntoSentences, tokenize, normalizeText } from './localKeywordExtraction';

describe('localKeywordExtraction', () => {
  describe('normalizeText', () => {
    it('lowercases and trims', () => {
      expect(normalizeText('  Hello World  ')).toBe('hello world');
    });

    it('removes accents', () => {
      expect(normalizeText('café niño')).toBe('cafe nino');
    });

    it('normalizes dashes', () => {
      expect(normalizeText('hello-world')).toBe('hello world');
    });
  });

  describe('splitIntoSentences', () => {
    it('splits by period', () => {
      const text = 'First sentence. Second sentence.';
      expect(splitIntoSentences(text)).toEqual(['First sentence.', 'Second sentence.']);
    });

    it('splits by question and exclamation', () => {
      const text = 'Hello? World!';
      expect(splitIntoSentences(text)).toEqual(['Hello?', 'World!']);
    });

    it('handles empty text', () => {
      expect(splitIntoSentences('')).toEqual([]);
    });

    it('ignores whitespace-only', () => {
      expect(splitIntoSentences('   .   ')).toEqual([]);
    });
  });

  describe('tokenize', () => {
    it('removes stopwords', () => {
      const tokens = tokenize('the quick brown fox');
      expect(tokens).not.toContain('the');
      expect(tokens).toContain('quick');
      expect(tokens).toContain('brown');
      expect(tokens).toContain('fox');
    });

    it('removes short tokens', () => {
      const tokens = tokenize('a an i');
      expect(tokens).toEqual([]);
    });

    it('handles Spanish stopwords', () => {
      const tokens = tokenize('el gato come pescado');
      expect(tokens).not.toContain('el');
      expect(tokens).not.toContain('come'); // "come" is a verb form, filtered
      expect(tokens).toContain('gato');
      expect(tokens).toContain('pescado');
    });
  });

  describe('extractKeywordsLocal', () => {
    it('returns empty for short text', async () => {
      const result = await extractKeywordsLocal('Hi.');
      expect(result.keywords).toEqual([]);
    });

    it('returns empty for few sentences', async () => {
      const result = await extractKeywordsLocal('Hello world. How are you.');
      expect(result.keywords).toEqual([]);
    });

    it('extracts keywords from English text', async () => {
      const text = `
        Machine learning enables computers to learn from data.
        Deep learning uses neural networks with multiple layers.
        Neural networks process information through interconnected nodes.
        Training data teaches the model to make predictions.
        The model improves accuracy through repeated iterations.
      `;
      const result = await extractKeywordsLocal(text, { language: 'en' });
      expect(result.keywords.length).toBeGreaterThan(0);
      const terms = result.keywords.map(k => k.term);
      expect(terms.some(t => t.includes('learning') || t.includes('neural') || t.includes('model'))).toBe(true);
    });

    it('extracts keywords from Spanish text', async () => {
      const text = `
        El aprendizaje automático permite a las computadoras aprender de los datos.
        Las redes neuronales procesan información a través de nodos interconectados.
        El entrenamiento enseña al modelo a hacer predicciones precisas.
        La precisión mejora mediante iteraciones repetidas.
        Los algoritmos optimizan los parámetros internos.
      `;
      const result = await extractKeywordsLocal(text, { language: 'es' });
      expect(result.keywords.length).toBeGreaterThan(0);
      const terms = result.keywords.map(k => k.term);
      expect(terms.some(t => t.includes('aprendizaje') || t.includes('redes') || t.includes('modelo'))).toBe(true);
    });

    it('returns phrase type for multi-word terms', async () => {
      const text = `
        Machine learning is a powerful technique.
        Deep learning uses neural networks effectively.
        Neural networks learn from data automatically.
        Supervised learning requires labeled data.
        Unsupervised learning finds hidden patterns.
        Reinforcement learning learns from rewards.
        Transfer learning applies knowledge to new tasks.
        Machine learning models improve over time.
      `;
      const result = await extractKeywordsLocal(text, { language: 'en', maxKeywords: 50 });
      const phrases = result.keywords.filter(k => k.type === 'phrase');
      expect(phrases.length).toBeGreaterThan(0);
    });

    it('includes context sentence', async () => {
      const text = 'Machine learning enables computers. It uses algorithms.';
      const result = await extractKeywordsLocal(text, { language: 'en' });
      for (const kw of result.keywords) {
        expect(kw.context).toBeTruthy();
        expect(kw.context.length).toBeGreaterThan(0);
      }
    });

    it('respects maxKeywords limit', async () => {
      const text = `
        Machine learning enables computers to learn from data.
        Deep learning uses neural networks with multiple layers.
        Neural networks process information through interconnected nodes.
        Training data teaches the model to make predictions.
        The model improves accuracy through repeated iterations.
        Algorithms optimize parameters during training.
        Supervised learning uses labeled data.
        Unsupervised learning finds hidden patterns.
        Reinforcement learning learns from rewards.
        Transfer learning applies knowledge to new tasks.
      `;
      const result = await extractKeywordsLocal(text, { language: 'en', maxKeywords: 5 });
      expect(result.keywords.length).toBeLessThanOrEqual(5);
    });

    it('deduplicates overlapping phrases', async () => {
      const text = `
        Machine learning is great. Machine learning helps. Learning is important.
      `;
      const result = await extractKeywordsLocal(text, { language: 'en' });
      const terms = result.keywords.map(k => k.term.toLowerCase());
      const uniqueTerms = new Set(terms);
      expect(uniqueTerms.size).toBe(terms.length);
    });

    it('returns correct structure', async () => {
      const text = 'Machine learning enables computers to learn from data effectively.';
      const result = await extractKeywordsLocal(text, { language: 'en' });
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('originalText');
      expect(result).toHaveProperty('language');
      for (const kw of result.keywords) {
        expect(kw).toHaveProperty('term');
        expect(kw).toHaveProperty('score');
        expect(kw).toHaveProperty('frequency');
        expect(kw).toHaveProperty('type');
        expect(kw).toHaveProperty('context');
        expect(['word', 'phrase']).toContain(kw.type);
      }
    });
  });
});