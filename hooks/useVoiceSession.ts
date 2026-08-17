import { useState, useEffect, useRef, useCallback } from 'react';
import { AssociationList } from '../types';
import { GlimmindGame } from '../services/gameEngine';
import { useGameStore } from '../store/gameStore';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSpeechRecognition } from './useSpeechRecognition';
import { resolveVoiceLanguages } from '../services/voice/languages';
import { isExactExpectedAnswer } from '../services/voice/earlyMatch';
import { createActivityEvent } from '../utils/activity';
import { evaluateAnswer } from '../services/voice/evaluateAnswer';
import { transcribeSpeech } from '../services/voice/chipttStt';

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
const POST_TTS_DELAY_MS = 3000;
const MAX_FAILED_ATTEMPTS = 3;

export function useVoiceSession(list: AssociationList) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<VoiceSessionCounts>({ total: 0, correct: 0, incorrect: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState(false);

  const trackingEnabled = useGameStore.getState().settings.activityHistoryEnabled;

  const gameRef = useRef(GlimmindGame.create(list, { trackingEnabled }));
  const sessionIdRef = useRef(crypto.randomUUID());
  const shouldRunRef = useRef(false);
  const phaseRef = useRef<VoicePhase>('idle');
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerHandledRef = useRef(false);
  const listeningFailedRef = useRef(false);
  const transcriptRef = useRef('');
  const attemptBlobsRef = useRef<Blob[]>([]);
  const failedAttemptsRef = useRef(0);
  const currentAttemptBlobRef = useRef<Blob | null>(null);
  const isFallbackActiveRef = useRef(false);
  const fallbackAbortRef = useRef(false);

  const intentStreamRef = useRef<MediaStream | null>(null);
  const intentRecorderRef = useRef<MediaRecorder | null>(null);
  const intentChunksRef = useRef<Blob[]>([]);

  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  }, [list]);

  const handleAnswerRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  });

  const handleSTTInterim = useCallback(async (text: string) => {
    if (answerHandledRef.current) return;
    const current = gameRef.current.currentAssociation;
    if (!current) return;
    if (phaseRef.current !== 'listening_for_answer') return;

    const isReversed = listRef.current.settings.flipOrder === 'reversed';
    const expected = isReversed ? current.definition : current.term;

    if (isExactExpectedAnswer(text, expected)) {
      answerHandledRef.current = true;
      stt.stop();
      await stopIntentRecorder();
      setTranscript(text);
      transcriptRef.current = text;
      setPhaseBoth('evaluating');
      void handleAnswerRef.current(text);
    }
  }, [setPhaseBoth, stopIntentRecorder, setTranscript]);

  const handleSTTFinal = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (answerHandledRef.current) {
      return;
    }
    setTranscript(trimmed);
    transcriptRef.current = trimmed;
    if (phaseRef.current === 'listening_for_answer') {
      await stopIntentRecorder();
      setPhaseBoth('evaluating');
      void handleAnswerRef.current(trimmed);
    }
  }, [setPhaseBoth, stopIntentRecorder, setTranscript]);

  const handleSTTError = useCallback((message: string) => {
    setError(message);
    setPhaseBoth('idle');
  }, [setPhaseBoth, setError]);

  const tts = useSpeechSynthesis(list.settings.ttsProvider || 'browser');
  const stt = useSpeechRecognition({
    provider: list.settings.sttProvider || 'browser',
    onInterim: handleSTTInterim,
    onFinal: handleSTTFinal,
    onError: handleSTTError,
  });

  const languages = resolveVoiceLanguages(list.concept, list.settings.flipOrder, {
    termLang: list.settings.voiceTermLang,
    defLang: list.settings.voiceDefLang,
  });

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

  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        if (base64) resolve(base64);
        else reject(new Error('Failed to encode blob'));
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
    });
  }, []);

  const startIntentRecorder = useCallback(async () => {
    if (intentRecorderRef.current && intentRecorderRef.current.state !== 'inactive') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      intentStreamRef.current = stream;
      intentChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      intentRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          intentChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = intentChunksRef.current;
        intentChunksRef.current = [];
        if (chunks.length === 0) {
          currentAttemptBlobRef.current = null;
          return;
        }
        const blob = new Blob(chunks, { type: mimeType });
        currentAttemptBlobRef.current = blob;
      };

      recorder.onerror = () => {
        currentAttemptBlobRef.current = null;
      };

      recorder.start();
    } catch {
      currentAttemptBlobRef.current = null;
    }
  }, []);

  const stopIntentRecorder = useCallback(async (): Promise<void> => {
    const recorder = intentRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });
      } catch {
        // ignore
      }
    }
    if (intentStreamRef.current) {
      intentStreamRef.current.getTracks().forEach((track) => track.stop());
      intentStreamRef.current = null;
    }
    intentRecorderRef.current = null;
  }, []);

  const playCurrentWord = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = gameRef.current.currentAssociation;
    if (!current) return;

    stt.abort();
    stopIntentRecorder();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.definition : current.term;

    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    currentAttemptBlobRef.current = null;
    attemptBlobsRef.current = [];
    failedAttemptsRef.current = 0;
    isFallbackActiveRef.current = false;
    fallbackAbortRef.current = false;
    setIsFallbackActive(false);
    setPhaseBoth('speaking');
    await tts.speak(word, languages.ttsLang, isReversed ? list.settings.voiceDefId : list.settings.voiceTermId, list.settings.voiceRate, list.settings.voicePitch);
    if (!shouldRunRef.current) return;
    await new Promise((resolve) => setTimeout(resolve, POST_TTS_DELAY_MS));
    if (!shouldRunRef.current) return;
    setPhaseBoth('listening_for_answer');
    answerHandledRef.current = false;
    listeningFailedRef.current = false;
    await startIntentRecorder();
    stt.start(languages.sttLang);
  }, [list.settings.flipOrder, list.settings.voiceTermId, list.settings.voiceDefId, list.settings.voiceRate, list.settings.voicePitch, tts, stt, languages.ttsLang, languages.sttLang, setPhaseBoth, stopIntentRecorder, startIntentRecorder]);

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

      if (correct) {
        const after = evaluated.processAction({ type: 'CORRECT' });
        gameRef.current = after;

        if (after.state.isFinished) {
          stt.abort();
          stopIntentRecorder();
          setIsFinished(true);
          setPhaseBoth('finished');
          return;
        }

        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        resultTimerRef.current = setTimeout(() => {
          resultTimerRef.current = null;
          if (shouldRunRef.current) void playCurrentWord();
        }, RESULT_DELAY_MS);
        return;
      }

      const blob = currentAttemptBlobRef.current;
      if (blob && list.settings.voiceSttFallback) {
        attemptBlobsRef.current = [...attemptBlobsRef.current, blob];
        failedAttemptsRef.current += 1;
        console.log('Intento ' + failedAttemptsRef.current + ': Usando STT Browser, se guarda el audio');
      }
      currentAttemptBlobRef.current = null;

      if (failedAttemptsRef.current >= MAX_FAILED_ATTEMPTS && list.settings.voiceSttFallback) {
        void runFallback();
        return;
      }

      const after = evaluated.processAction({ type: 'PASS' });
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
    [list.id, trackingEnabled, stt, setPhaseBoth, runFallback, playCurrentWord],
  );

  const runFallback = useCallback(async () => {
    if (!shouldRunRef.current) return;
    if (isFallbackActiveRef.current) return;
    if (!list.settings.voiceSttFallback) return;

    stopIntentRecorder();

    const blobs = attemptBlobsRef.current;
    if (blobs.length === 0) return;

    isFallbackActiveRef.current = true;
    fallbackAbortRef.current = false;
    setIsFallbackActive(true);
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    answerHandledRef.current = false;
    listeningFailedRef.current = false;
    setPhaseBoth('evaluating');

    const current = gameRef.current.currentAssociation;
    if (!current) {
      isFallbackActiveRef.current = false;
      setIsFallbackActive(false);
      return;
    }

    const isReversed = list.settings.flipOrder === 'reversed';
    const expected = isReversed ? current.definition : current.term;
    const lang = list.settings.voiceTermLang || 'es';
    const threshold = list.settings.threshold ?? 0.95;
    const ignoreArticles = list.settings.ignoreArticles ?? false;

    let foundCorrect = false;

    console.log('fallback activado: Usando Chip y enviando audio...');

    for (let i = 0; i < blobs.length; i++) {
      if (fallbackAbortRef.current || !shouldRunRef.current) break;

      const blob = blobs[i];
      try {
        const base64 = await blobToBase64(blob);
        const encoding = blob.type.includes('ogg') ? 'OGG_OPUS' : blob.type.includes('opus') ? 'WEBM_OPUS' : 'WEBM';
        const result = await transcribeSpeech({
          audioContent: base64,
          encoding,
          sampleRateHertz: 48000,
          languageCode: lang,
          audioDuration: 60,
        });

        const trimmed = result.transcript?.trim();
        if (!trimmed) continue;

        const evaluation = evaluateAnswer(trimmed, expected, { threshold, ignoreArticles });
        console.log('Audio ' + (i + 1) + ': ' + trimmed + ' → ' + (evaluation.correct ? 'calza con el valor' : 'no calza con el valor'));

        if (evaluation.correct) {
          answerHandledRef.current = false;
          setTranscript(trimmed);
          transcriptRef.current = trimmed;
          setPhaseBoth('evaluating');
          void handleAnswerRef.current(trimmed);
          foundCorrect = true;
          break;
        }
      } catch {
        // continue with next blob
      }
    }

    isFallbackActiveRef.current = false;
    setIsFallbackActive(false);

    if (!foundCorrect && shouldRunRef.current) {
      const before = gameRef.current;
      const current = before.currentAssociation;
      if (!current) return;
      const evaluated = before.setUserInput('').checkAnswer();
      const after = evaluated.processAction({ type: 'PASS' });
      gameRef.current = after;
      setCounts((prev) => ({
        ...prev,
        total: prev.total + 1,
        incorrect: prev.incorrect + 1,
      }));
      if (after.state.isFinished) {
        setIsFinished(true);
        setPhaseBoth('finished');
        return;
      }
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => {
        resultTimerRef.current = null;
        if (shouldRunRef.current) void playCurrentWord();
      }, RESULT_DELAY_MS);
    }
  }, [blobToBase64, list.settings.flipOrder, list.settings.voiceTermLang, list.settings.threshold, list.settings.ignoreArticles, list.settings.voiceSttFallback, setPhaseBoth, playCurrentWord]);

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
    stopIntentRecorder();
    isFallbackActiveRef.current = false;
    fallbackAbortRef.current = true;
    setIsFallbackActive(false);
    setPhaseBoth('idle');
  }, [stt, tts, setPhaseBoth, stopIntentRecorder]);

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
      stopIntentRecorder();
      isFallbackActiveRef.current = false;
      fallbackAbortRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (phaseRef.current !== 'listening_for_answer') return;
    if (stt.isListening) return;
    if (stt.isProcessing) return;
    if (answerHandledRef.current) return;
    if (listeningFailedRef.current) return;

    const timeout = setTimeout(() => {
      if (phaseRef.current !== 'listening_for_answer') return;
      if (stt.isListening) return;
      if (stt.isProcessing) return;
      if (answerHandledRef.current) return;
      if (listeningFailedRef.current) return;

      listeningFailedRef.current = true;
      const pending = transcriptRef.current.trim();
      if (pending) {
        setPhaseBoth('evaluating');
        void handleAnswerRef.current(pending);
      } else {
        setPhaseBoth('idle');
        setError('No speech detected.');
      }
    }, LISTENING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [phase, stt.isListening, stt.isProcessing, setPhaseBoth]);

  return {
    phase,
    transcript,
    interim: stt.interimTranscript,
    error,
    counts,
    isFinished,
    isListening: stt.isListening,
    recordingTimeLeft: stt.recordingTimeLeft,
    recordingElapsed: stt.recordingElapsed,
    maxRecordingSeconds: stt.maxRecordingSeconds,
    currentAssociation: gameRef.current.currentAssociation,
    gameState: gameRef.current.state,
    start,
    stop,
    restart,
    repeat,
    submitTyped,
    isFallbackActive,
  };
}
