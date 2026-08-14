import { useState, useEffect, useRef, useCallback } from 'react';
import { AssociationList } from '../types';
import { GlimmindGame } from '../services/gameEngine';
import { useGameStore } from '../store/gameStore';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSpeechRecognition } from './useSpeechRecognition';
import { resolveVoiceLanguages } from '../services/voice/languages';
import { isExactExpectedAnswer } from '../services/voice/earlyMatch';
import { createActivityEvent } from '../utils/activity';

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

const RESULT_DELAY_MS = 900;
const LISTENING_TIMEOUT_MS = 2000;

export function useVoiceSession(list: AssociationList) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<VoiceSessionCounts>({ total: 0, correct: 0, incorrect: 0 });
  const [isFinished, setIsFinished] = useState(false);

  const trackingEnabled = useGameStore.getState().settings.activityHistoryEnabled;

  const gameRef = useRef(GlimmindGame.create(list, { trackingEnabled }));
  const sessionIdRef = useRef(crypto.randomUUID());
  const shouldRunRef = useRef(false);
  const phaseRef = useRef<VoicePhase>('idle');
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerHandledRef = useRef(false);
  const listeningFailedRef = useRef(false);
  const transcriptRef = useRef('');

  useEffect(() => {
    gameRef.current = gameRef.current.updateList(list);
  }, [list]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const setPhaseBoth = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const tts = useSpeechSynthesis(list.settings.ttsProvider || 'browser');
  console.log('[VoiceSession] ttsProvider=', list.settings.ttsProvider, 'voiceTermId=', list.settings.voiceTermId, 'voiceDefId=', list.settings.voiceDefId);
  const stt = useSpeechRecognition({
    onInterim: (text) => {
      if (answerHandledRef.current) return;
      const current = gameRef.current.currentAssociation;
      if (!current) return;
      if (phaseRef.current !== 'listening_for_answer') return;

      const isReversed = list.settings.flipOrder === 'reversed';
      const expected = isReversed ? current.definition : current.term;

      console.log('[STT] expected="' + expected + '"');
      console.log('[STT] interim="' + text + '"');
      console.log('[STT] exact match=' + isExactExpectedAnswer(text, expected));

      if (isExactExpectedAnswer(text, expected)) {
        console.log('[STT] EARLY MATCH → accepting answer');
        answerHandledRef.current = true;
        stt.stop();
        setTranscript(text);
        transcriptRef.current = text;
        setPhaseBoth('evaluating');
        void handleAnswer(text);
      }
    },
    onFinal: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (answerHandledRef.current) {
        console.log('[STT] answer already handled → ignored final:', trimmed);
        return;
      }
      setTranscript(trimmed);
      transcriptRef.current = trimmed;
      if (phaseRef.current === 'listening_for_answer') {
        setPhaseBoth('evaluating');
        void handleAnswer(trimmed);
      }
    },
    onError: (message) => {
      setError(message);
      setPhaseBoth('idle');
    },
  });

  const languages = resolveVoiceLanguages(list.concept, list.settings.flipOrder, {
    termLang: list.settings.voiceTermLang,
    defLang: list.settings.voiceDefLang,
  });

  const playCurrentWord = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = gameRef.current.currentAssociation;
    if (!current) return;

    stt.abort();
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
    stt.start(languages.sttLang);
  }, [list.settings.flipOrder, list.settings.voiceTermId, list.settings.voiceDefId, list.settings.voiceRate, list.settings.voicePitch, tts, stt, languages.ttsLang, languages.sttLang, setPhaseBoth]);

  const handleAnswer = useCallback(
    (answer: string) => {
      const before = gameRef.current;
      const current = before.currentAssociation;
      if (!current) return;

      const evaluated = before.setUserInput(answer).checkAnswer();
      const correct = evaluated.state.feedback === 'correct';

      if (trackingEnabled) {
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
        stt.abort();
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
    [list.id, trackingEnabled, stt, playCurrentWord, setPhaseBoth],
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
      stt.abort();
      setTranscript(trimmed);
      transcriptRef.current = trimmed;
      setPhaseBoth('evaluating');
      void handleAnswer(trimmed);
    },
    [stt, handleAnswer, setPhaseBoth],
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
    stt.abort();
    tts.cancel();
    setPhaseBoth('idle');
  }, [stt, tts, setPhaseBoth]);

  const restart = useCallback(() => {
    stop();
    gameRef.current = GlimmindGame.create(list, { trackingEnabled });
    sessionIdRef.current = crypto.randomUUID();
    setCounts({ total: 0, correct: 0, incorrect: 0 });
    setIsFinished(false);
    shouldRunRef.current = true;
    void playCurrentWord();
  }, [list, trackingEnabled, stop, playCurrentWord]);

  useEffect(() => {
    shouldRunRef.current = true;
    void playCurrentWord();
    return () => {
      shouldRunRef.current = false;
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      stt.abort();
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
