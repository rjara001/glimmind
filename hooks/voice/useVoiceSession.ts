import { useState, useEffect, useRef, useCallback } from 'react';
import { AssociationList } from '../../types';
import { GlimmindGame } from '../../services/gameEngine';
import { useGameStore } from '../../store/gameStore';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSpeechRecognition } from './useSpeechRecognition';
import { resolveVoiceLanguages } from '../../services/voice/languages';
import { isExactExpectedAnswer } from '../../services/voice/earlyMatch';
import { createActivityEvent } from '../../utils/activity';
import { RESULT_DELAY_MS, LISTENING_TIMEOUT_MS } from '../../constants/voice';
import { useVoiceGameRefs } from './useVoiceGameRefs';
import { useVoiceSTT } from './useVoiceSTT';

export interface VoiceSessionCounts {
  total: number;
  correct: number;
  incorrect: number;
}

export type VoicePhase = 'idle' | 'speaking' | 'listening_for_answer' | 'evaluating' | 'finished';

export interface VoiceSessionResult {
  listId: string;
  listName: string;
  counts: VoiceSessionCounts;
  onRestart: () => void;
  onBack: () => void;
}

export function useVoiceSession(list: AssociationList) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<VoiceSessionCounts>({ total: 0, correct: 0, incorrect: 0 });
  const [isFinished, setIsFinished] = useState(false);

  const { gameRef, sessionIdRef, shouldRunRef, phaseRef, resultTimerRef, answerHandledRef, listeningFailedRef, transcriptRef } = useVoiceGameRefs(list);

  const setPhaseBoth = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, [phaseRef, setPhase]);

  const handleSTTInterim = (text: string) => {
    if (answerHandledRef.current) return;
    const current = gameRef.current.currentAssociation;
    if (!current) return;
    if (phaseRef.current !== 'listening_for_answer') return;

    const isReversed = list.settings.flipOrder === 'reversed';
    const expected = isReversed ? current.definition : current.term;

    if (isExactExpectedAnswer(text, expected)) {
      answerHandledRef.current = true;
      setTranscript(text);
      transcriptRef.current = text;
      setPhaseBoth('evaluating');
      void handleAnswer(text);
    }
  };

  const handleSTTFinal = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (answerHandledRef.current) {
      return;
    }
    setTranscript(trimmed);
    transcriptRef.current = trimmed;
    if (phaseRef.current === 'listening_for_answer') {
      setPhaseBoth('evaluating');
      void handleAnswer(trimmed);
    }
  };

  const handleSTTError = (message: string) => {
    setError(message);
    setPhaseBoth('idle');
  };

  const { tts, stt, languages, stop: stopSTT, start: startSTT, abort: abortSTT } = useVoiceSTT({
    list,
    onInterim: handleSTTInterim,
    onFinal: handleSTTFinal,
    onError: handleSTTError,
  });

  const playCurrentWord = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = gameRef.current.currentAssociation;
    if (!current) return;

    stopSTT();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.definition : current.term;

    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    setPhaseBoth('speaking');
    await tts.speak(word, languages.ttsLang, isReversed ? list.settings.voiceDefId : list.settings.voiceTermId, list.settings.voiceRate, list.settings.voicePitch);
    if (!shouldRunRef.current) return;
    setPhaseBoth('listening_for_answer');
    answerHandledRef.current = false;
    listeningFailedRef.current = false;
    startSTT(languages.sttLang);
  }, [list.settings.flipOrder, list.settings.voiceTermId, list.settings.voiceDefId, list.settings.voiceRate, list.settings.voicePitch, tts, languages.ttsLang, languages.sttLang, setPhaseBoth, stopSTT, startSTT]);

  const handleAnswer = useCallback(
    (answer: string) => {
      const before = gameRef.current;
      const current = before.currentAssociation;
      if (!current) return;

      const evaluated = before.setUserInput(answer).checkAnswer();
      const correct = evaluated.state.feedback === 'correct';

      if (useGameStore.getState().settings.activityHistoryEnabled) {
        const userId = useGameStore.getState().user?.uid || '';
        useGameStore.getState().recordActivity([
          createActivityEvent({
            userId,
            listId: list.id,
            cardId: current.id,
            cardTerm: current.term,
            sessionId: sessionIdRef.current,
            type: 'card_answered',
            correct,
          }),
        ]);
      }

      setCounts((prev) => ({
        total: prev.total + 1,
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
      }));

      const after = evaluated.processAction({ type: correct ? 'CORRECT' : 'PASS' });
      gameRef.current = after;

      if (after.state.isFinished) {
        stopSTT();
        setIsFinished(true);
        setPhaseBoth('finished');
        return;
      }

      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => {
        resultTimerRef.current = null;
        if (shouldRunRef.current) void playCurrentWord();
      }, RESULT_DELAY_MS);
    },
    [list.id, stt, playCurrentWord, setPhaseBoth, gameRef, sessionIdRef, resultTimerRef, shouldRunRef, stopSTT],
  );

  const repeat = useCallback(() => {
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    void playCurrentWord();
  }, [playCurrentWord]);

  const submitTyped = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      stopSTT();
      setTranscript(trimmed);
      transcriptRef.current = trimmed;
      setPhaseBoth('evaluating');
      void handleAnswer(trimmed);
    },
    [stopSTT, handleAnswer, setPhaseBoth],
  );

  const start = useCallback(() => {
    shouldRunRef.current = true;
    setError(null);
    setIsFinished(false);
    void playCurrentWord();
  }, [playCurrentWord]);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    stopSTT();
    tts.cancel();
    setPhaseBoth('idle');
  }, [setPhaseBoth, stopSTT, tts]);

  const restart = useCallback(() => {
    stop();
    gameRef.current = GlimmindGame.create(list, { trackingEnabled: useGameStore.getState().settings.activityHistoryEnabled });
    sessionIdRef.current = crypto.randomUUID();
    setCounts({ total: 0, correct: 0, incorrect: 0 });
    setIsFinished(false);
    shouldRunRef.current = true;
    void playCurrentWord();
  }, [list, stop, playCurrentWord]);

  useEffect(() => {
    shouldRunRef.current = true;
    void playCurrentWord();
    return () => {
      shouldRunRef.current = false;
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      stopSTT();
      tts.cancel();
    };
  }, []);

  useEffect(() => {
    if (phaseRef.current !== 'listening_for_answer') return;
    if (stt.isListening) return;
    if (answerHandledRef.current) return;
    if (listeningFailedRef.current) return;

    const timeout = setTimeout(() => {
      if (phaseRef.current !== 'listening_for_answer') return;
      if (stt.isListening) return;
      if (answerHandledRef.current) return;
      if (listeningFailedRef.current) return;

      listeningFailedRef.current = true;
      const pending = transcriptRef.current.trim();
      if (pending) {
        setPhaseBoth('evaluating');
        void handleAnswer(pending);
      } else {
        setPhaseBoth('idle');
        setError('No speech detected.');
      }
    }, LISTENING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [phase, stt.isListening, handleAnswer, setPhaseBoth]);

  return {
    phase,
    transcript,
    interim: stt.interimTranscript,
    error,
    counts,
    isFinished,
    isListening: stt.isListening,
    currentAssociation: gameRef.current.currentAssociation,
    gameState: gameRef.current.state,
    start,
    stop,
    restart,
    repeat,
    submitTyped,
  };
}
