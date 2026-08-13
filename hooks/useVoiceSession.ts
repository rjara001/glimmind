import { useState, useEffect, useRef, useCallback } from 'react';
import { AssociationList } from '../types';
import { GlimmindGame } from '../services/gameEngine';
import { useGameStore } from '../store/gameStore';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useAudioRecorder } from './useAudioRecorder';
import { resolveVoiceLanguages } from '../services/voice/languages';
import { createActivityEvent } from '../utils/activity';
import { uploadAudioRecording, buildAudioPath } from '../services/audioService';

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

export function useVoiceSession(list: AssociationList) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<VoiceSessionCounts>({ total: 0, correct: 0, incorrect: 0 });
  const [isFinished, setIsFinished] = useState(false);

  const trackingEnabled = useGameStore.getState().settings.activityHistoryEnabled;
  const audioRecordingEnabled = useGameStore.getState().settings.audioRecordingEnabled;

  const gameRef = useRef(GlimmindGame.create(list, { trackingEnabled }));
  const sessionIdRef = useRef(crypto.randomUUID());
  const shouldRunRef = useRef(false);
  const phaseRef = useRef<VoicePhase>('idle');
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  const setPhaseBoth = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const tts = useSpeechSynthesis();
  const audioRecorder = useAudioRecorder({
    enabled: audioRecordingEnabled,
    onRecordingAvailable: (blob) => {
      audioBlobRef.current = blob;
    },
  });
  const stt = useSpeechRecognition({
    onFinal: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setTranscript(trimmed);
      audioRecorder.stopRecording();
      if (phaseRef.current === 'listening_for_answer') {
        setPhaseBoth('evaluating');
        void handleAnswer(trimmed);
      }
    },
    onError: (message) => {
      audioRecorder.abortRecording();
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
    audioRecorder.abortRecording();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.definition : current.term;

    setError(null);
    setTranscript('');
    audioBlobRef.current = null;
    setPhaseBoth('speaking');
    await tts.speak(word, languages.ttsLang);
    if (!shouldRunRef.current) return;
    setPhaseBoth('listening_for_answer');
    if (audioRecordingEnabled) {
      audioRecorder.startRecording();
    }
    stt.start(languages.sttLang);
  }, [list.settings.flipOrder, tts, stt, languages.ttsLang, languages.sttLang, setPhaseBoth, audioRecorder, audioRecordingEnabled]);

  const uploadAudio = useCallback(async (blob: Blob, correct: boolean, term: string, transcript: string) => {
    const userId = useGameStore.getState().user?.uid || 'anonymous';
    const current = gameRef.current.currentAssociation;
    if (!current) return;
    try {
      const metadata: Parameters<typeof uploadAudioRecording>[1] = {
        userId,
        listId: list.id,
        associationId: current.id,
        sessionId: sessionIdRef.current,
        term,
        transcript,
        correct,
        timestamp: Date.now(),
      };
      const path = buildAudioPath(metadata);
      await uploadAudioRecording(blob, metadata);
      console.log('[Audio] Uploaded:', path);
    } catch (err) {
      console.error('[Audio] Upload failed:', err);
    }
  }, [list.id]);

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

      if (audioBlobRef.current) {
        void uploadAudio(audioBlobRef.current, correct, current.term, answer);
        audioBlobRef.current = null;
      }

      if (after.state.isFinished) {
        stt.abort();
        audioRecorder.abortRecording();
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
    [list.id, trackingEnabled, stt, playCurrentWord, setPhaseBoth, audioRecorder, uploadAudio],
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
    audioRecorder.abortRecording();
    tts.cancel();
    setPhaseBoth('idle');
  }, [stt, audioRecorder, tts, setPhaseBoth]);

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
      audioRecorder.abortRecording();
      tts.cancel();
    };
  }, []);

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
