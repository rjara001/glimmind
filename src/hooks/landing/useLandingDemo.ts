import { useCallback, useMemo, useState } from 'react';
import { LANDING_DEMO_DECK } from '../../constants/landingDemoDeck';
import { SIMILARITY_THRESHOLD } from '../../constants/deckValidation';
import { calculateSimilarity } from '../../utils/similarity';
import { getAutoHintMode, maskHint } from '../../utils/maskHint';
import type { DemoCard, DemoFeedback, LandingDemoStats } from '../../types/landing-demo';

export const LANDING_DEMO_DECK_LENGTH = LANDING_DEMO_DECK.length;

export interface LandingDemoState extends LandingDemoStats {
  currentIndex: number;
  card: DemoCard;
  hint: string;
  progress: number;
  inputValue: string;
  feedback: DemoFeedback;
  similarity: number | null;
  lastAttempt: string;
  isRevealed: boolean;
  hasAttempted: boolean;
  handleInputChange: (value: string) => void;
  handleValidate: () => void;
  handleReveal: () => void;
  handleNext: () => void;
  handleReset: () => void;
}

export function useLandingDemo(): LandingDemoState {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<DemoFeedback>('none');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [lastAttempt, setLastAttempt] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  const card = LANDING_DEMO_DECK[currentIndex];

  const hint = useMemo(
    () => maskHint(card.definition, getAutoHintMode(card.cycle)),
    [card.definition, card.cycle]
  );

  const accuracy = useMemo(
    () => (attemptCount === 0 ? 0 : Math.round((correctCount / attemptCount) * 100)),
    [correctCount, attemptCount]
  );

  const resetAttempt = useCallback(() => {
    setInputValue('');
    setFeedback('none');
    setSimilarity(null);
    setLastAttempt('');
    setIsRevealed(false);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const handleValidate = useCallback(() => {
    const userAnswer = inputValue.trim();

    if (userAnswer.length === 0) return;

    const score = Math.round(calculateSimilarity(userAnswer, card.definition) * 100);
    const isCorrect = score >= SIMILARITY_THRESHOLD * 100;

    setSimilarity(score);
    setLastAttempt(userAnswer);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setAttemptCount((prev) => prev + 1);
    setCorrectCount((prev) => (isCorrect ? prev + 1 : prev));
  }, [inputValue, card.definition]);

  const handleReveal = useCallback(() => {
    setIsRevealed(true);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % LANDING_DEMO_DECK_LENGTH);
    resetAttempt();
  }, [resetAttempt]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setCorrectCount(0);
    setAttemptCount(0);
    resetAttempt();
  }, [resetAttempt]);

  return {
    currentIndex,
    card,
    hint,
    progress: currentIndex + 1,
    inputValue,
    feedback,
    similarity,
    lastAttempt,
    isRevealed,
    hasAttempted: feedback !== 'none' || isRevealed,
    correctCount,
    attemptCount,
    accuracy,
    handleInputChange,
    handleValidate,
    handleReveal,
    handleNext,
    handleReset,
  };
}