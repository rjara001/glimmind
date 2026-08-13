import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Association, AssociationList, VoiceCommandId, VoiceCommandsConfig } from '../types';
import { useGameStore } from '../store/gameStore';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useAudioRecorder } from './useAudioRecorder';
import { resolveVoiceLanguages } from '../services/voice/languages';
import { matchVoiceCommand, resolveVoiceCommands } from '../services/voice/commands';
import { uploadAudioRecording, buildAudioPath } from '../services/audioService';

export type GameVoicePhase = 'idle' | 'speaking' | 'listening' | 'evaluating' | 'feedback';

export interface UseGameVoiceOptions {
  list: AssociationList;
  enabled: boolean;
  currentAssociation: Association | undefined;
  feedback: 'none' | 'correct' | 'incorrect';
  evaluationCount: number;
  onSubmitVoice: (text: string) => void;
  onAdvance: () => void;
  commands?: VoiceCommandsConfig;
  onCommand?: (command: VoiceCommandId) => void;
  revealed?: boolean;
}

const FEEDBACK_DELAY_MS = 500;

export function useGameVoice({
  list,
  enabled,
  currentAssociation,
  feedback,
  evaluationCount,
  onSubmitVoice,
  onAdvance,
  commands,
  onCommand,
  revealed = false,
}: UseGameVoiceOptions) {
  const [phase, setPhase] = useState<GameVoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const shouldRunRef = useRef(false);
  const phaseRef = useRef<GameVoicePhase>('idle');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAssociationRef = useRef(currentAssociation);
  const onSubmitVoiceRef = useRef(onSubmitVoice);
  const onAdvanceRef = useRef(onAdvance);
  const commandsRef = useRef<VoiceCommandsConfig>(resolveVoiceCommands(commands));
  const onCommandRef = useRef(onCommand);
  const revealedRef = useRef(revealed);
  const feedbackRef = useRef(feedback);
  const audioBlobRef = useRef<Blob | null>(null);
  const pendingTranscriptRef = useRef<string>('');

  const audioRecordingEnabled = useGameStore.getState().settings.audioRecordingEnabled;
  const audioRecorder = useAudioRecorder({
    enabled: enabled && audioRecordingEnabled,
    onRecordingAvailable: (blob) => {
      audioBlobRef.current = blob;
    },
  });

  useEffect(() => {
    currentAssociationRef.current = currentAssociation;
  }, [currentAssociation]);

  useEffect(() => {
    onSubmitVoiceRef.current = onSubmitVoice;
  }, [onSubmitVoice]);

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  useEffect(() => {
    commandsRef.current = resolveVoiceCommands(commands);
  }, [commands]);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  const setPhaseBoth = useCallback((next: GameVoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const tts = useSpeechSynthesis();
  const stt = useSpeechRecognition({
    onFinal: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setTranscript(trimmed);
      audioRecorder.stopRecording();
      pendingTranscriptRef.current = trimmed;
      const matched = matchVoiceCommand(trimmed, commandsRef.current);
      if (matched) {
        if (matched === 'continue') {
          if (phaseRef.current === 'feedback') {
            clearFeedbackTimer();
            if (feedbackRef.current === 'correct') {
              onAdvanceRef.current();
            } else if (feedbackRef.current === 'incorrect') {
              void speakCurrentWord();
            }
          }
          return;
        }
        if (matched === 'stop') {
          onCommandRef.current?.('stop');
          return;
        }
        if (matched === 'reveal' || matched === 'pass') {
          if (phaseRef.current === 'listening') {
            onCommandRef.current?.(matched);
          }
        }
        return;
      }
      if (phaseRef.current === 'listening' && !revealedRef.current) {
        setPhaseBoth('evaluating');
        onSubmitVoiceRef.current(trimmed);
      }
    },
    onError: (message) => {
      audioRecorder.abortRecording();
      setError(message);
      setPhaseBoth('idle');
    },
    onTransientMessage: (message) => {
      setError(message);
    },
  });

  const ttsRef = useRef(tts);
  useEffect(() => {
    ttsRef.current = tts;
  }, [tts]);

  const sttRef = useRef(stt);
  useEffect(() => {
    sttRef.current = stt;
  }, [stt]);

  const languages = useMemo(
    () =>
      resolveVoiceLanguages(list.concept, list.settings.flipOrder, {
        termLang: list.settings.voiceTermLang,
        defLang: list.settings.voiceDefLang,
      }),
    [list.concept, list.settings.flipOrder, list.settings.voiceTermLang, list.settings.voiceDefLang],
  );

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const uploadAudio = useCallback(async (blob: Blob, correct: boolean) => {
    const current = currentAssociationRef.current;
    const transcript = pendingTranscriptRef.current;
    if (!current || !transcript) return;
    const userId = useGameStore.getState().user?.uid || 'anonymous';
    try {
      const metadata: Parameters<typeof uploadAudioRecording>[1] = {
        userId,
        listId: list.id,
        associationId: current.id,
        sessionId: crypto.randomUUID(),
        term: current.term,
        transcript,
        correct,
        timestamp: Date.now(),
      };
      const path = buildAudioPath(metadata);
      await uploadAudioRecording(blob, metadata);
      console.log('[Audio] Uploaded:', path);
    } catch (err) {
      console.error('[Audio] Upload failed:', err);
    } finally {
      audioBlobRef.current = null;
      pendingTranscriptRef.current = '';
    }
  }, [list.id]);

  useEffect(() => {
    if (feedback === 'correct' || feedback === 'incorrect') {
      const blob = audioBlobRef.current;
      if (blob && blob.size > 0) {
        void uploadAudio(blob, feedback === 'correct');
      }
    }
  }, [feedback, uploadAudio]);

  const speakCurrentWord = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = currentAssociationRef.current;
    if (!current) return;
    sttRef.current.abort();
    audioRecorder.abortRecording();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.definition : current.term;
    setError(null);
    setTranscript('');
    pendingTranscriptRef.current = '';
    audioBlobRef.current = null;
    setPhaseBoth('speaking');
    const spoke = await ttsRef.current.speak(word, languages.ttsLang);
    if (!shouldRunRef.current) return;
    if (!spoke.ok) {
      const reason =
        spoke.voicesCount === 0
          ? 'El navegador no tiene voces instaladas.'
          : `Se usó la voz "${spoke.voiceName ?? 'por defecto'}".`;
      setError(`No se pudo reproducir el audio de voz. ${reason} Revisa el volumen del sistema.`);
    }
    setPhaseBoth('listening');
    if (audioRecordingEnabled) {
      audioRecorder.startRecording();
    }
    sttRef.current.start(languages.sttLang);
  }, [list.settings.flipOrder, languages.ttsLang, setPhaseBoth, audioRecorder, audioRecordingEnabled]);

  const speakAnswer = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = currentAssociationRef.current;
    if (!current) return;
    sttRef.current.abort();
    audioRecorder.abortRecording();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.term : current.definition;
    const lang = languages.sttLang;
    setError(null);
    setTranscript('');
    pendingTranscriptRef.current = '';
    audioBlobRef.current = null;
    setPhaseBoth('speaking');
    const spoke = await ttsRef.current.speak(word, lang);
    if (!shouldRunRef.current) return;
    if (!spoke.ok) {
      const reason =
        spoke.voicesCount === 0
          ? 'El navegador no tiene voces instaladas.'
          : `Se usó la voz "${spoke.voiceName ?? 'por defecto'}".`;
      setError(`No se pudo reproducir el audio de voz. ${reason} Revisa el volumen del sistema.`);
    }
    setPhaseBoth('listening');
    if (audioRecordingEnabled) {
      audioRecorder.startRecording();
    }
    sttRef.current.start(languages.sttLang);
  }, [list.settings.flipOrder, languages.sttLang, setPhaseBoth, audioRecorder, audioRecordingEnabled]);

  useEffect(() => {
    if (enabled) {
      shouldRunRef.current = true;
    } else {
      shouldRunRef.current = false;
      clearFeedbackTimer();
      sttRef.current.abort();
      audioRecorder.abortRecording();
      ttsRef.current.cancel();
      setPhaseBoth('idle');
      setTranscript('');
      setError(null);
    }
    return () => {
      shouldRunRef.current = false;
      clearFeedbackTimer();
      sttRef.current.abort();
      audioRecorder.abortRecording();
      ttsRef.current.cancel();
    };
  }, [enabled, clearFeedbackTimer, setPhaseBoth, audioRecorder]);

  useEffect(() => {
    if (!shouldRunRef.current) return;
    if (feedback === 'correct') {
      clearFeedbackTimer();
      setPhaseBoth('feedback');
      void (async () => {
        await ttsRef.current.speak('Correcto', languages.ttsLang);
        if (!shouldRunRef.current) return;
        feedbackTimerRef.current = setTimeout(() => {
          feedbackTimerRef.current = null;
          if (shouldRunRef.current) onAdvanceRef.current();
        }, FEEDBACK_DELAY_MS);
      })();
    } else if (feedback === 'incorrect') {
      clearFeedbackTimer();
      setPhaseBoth('feedback');
      void (async () => {
        await ttsRef.current.speak('Incorrecto', languages.ttsLang);
        if (!shouldRunRef.current) return;
        feedbackTimerRef.current = setTimeout(() => {
          feedbackTimerRef.current = null;
          if (shouldRunRef.current) void speakCurrentWord();
        }, FEEDBACK_DELAY_MS);
      })();
    } else if (feedback === 'none') {
      void speakCurrentWord();
    }
  }, [feedback, evaluationCount, enabled, clearFeedbackTimer, setPhaseBoth, speakCurrentWord, currentAssociation?.id, languages.ttsLang]);

  const repeat = useCallback(() => {
    clearFeedbackTimer();
    void speakCurrentWord();
  }, [clearFeedbackTimer, speakCurrentWord]);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    clearFeedbackTimer();
    sttRef.current.abort();
    audioRecorder.abortRecording();
    ttsRef.current.cancel();
    setPhaseBoth('idle');
    setTranscript('');
    setError(null);
  }, [clearFeedbackTimer, setPhaseBoth, audioRecorder]);

  return {
    phase,
    transcript,
    interim: stt.interimTranscript,
    error,
    isListening: stt.isListening,
    supported: stt.supported,
    repeat,
    speakAnswer,
    stop,
  };
}
