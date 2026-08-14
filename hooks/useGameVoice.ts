import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Association, AssociationList, VoiceCommandId, VoiceCommandsConfig } from '../types';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useAudioRecorder } from './useAudioRecorder';
import { uploadAudioRecording } from '../services/audioService';
import { useGameStore } from '../store/gameStore';
import { resolveVoiceLanguages } from '../services/voice/languages';
import { isExactExpectedAnswer } from '../services/voice/earlyMatch';
import { matchVoiceCommand, matchExactVoiceCommand, resolveVoiceCommands } from '../services/voice/commands';

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
  audioRecordingEnabled?: boolean;
}

const FEEDBACK_DELAY_MS = 500;
const LISTENING_TIMEOUT_MS = 2000;

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
  audioRecordingEnabled = false,
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
  const answerHandledRef = useRef(false);
  const listeningFailedRef = useRef(false);
  const transcriptRef = useRef('');
  const lastCommandRef = useRef<VoiceCommandId | null>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const pendingBlobRef = useRef<Blob | null>(null);

  const audioRecorder = useAudioRecorder({
    enabled: enabled && audioRecordingEnabled,
    onRecordingAvailable: (blob) => {
      pendingBlobRef.current = blob;
    },
  });

  const { startRecording, stopRecording, abortRecording } = audioRecorder;

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

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const setPhaseBoth = useCallback((next: GameVoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const tts = useSpeechSynthesis(list.settings.ttsProvider || 'browser');
  const stt = useSpeechRecognition({
    onInterim: (text) => {
      if (answerHandledRef.current) return;
      const current = currentAssociationRef.current;
      if (!current) return;
      if (phaseRef.current !== 'listening') return;
      if (revealedRef.current) return;

      const isReversed = list.settings.flipOrder === 'reversed';
      const expected = isReversed ? current.definition : current.term;

      console.log('[STT] expected="' + expected + '"');
      console.log('[STT] interim="' + text + '"');
      console.log('[STT] exact match=' + isExactExpectedAnswer(text, expected));

      if (isExactExpectedAnswer(text, expected)) {
        console.log('[STT] EARLY MATCH → accepting answer');
        answerHandledRef.current = true;
        sttRef.current.stop();
        setTranscript(text);
        transcriptRef.current = text;
        setPhaseBoth('evaluating');
        onSubmitVoiceRef.current(text);
        return;
      }

      const exactCommand = matchExactVoiceCommand(text, commandsRef.current);
      if (exactCommand) {
        console.log('[STT] interim exact command matched:', exactCommand, 'text:', text);
        lastCommandRef.current = exactCommand;
        onCommandRef.current?.(exactCommand);
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

      const matched = matchVoiceCommand(trimmed, commandsRef.current);
      if (matched) {
        if (lastCommandRef.current === matched) {
          console.log('[STT] final command already handled in interim → ignored:', matched);
          return;
        }
        lastCommandRef.current = matched;
        console.log('[STT] final command matched:', matched, 'text:', trimmed);
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
      setError(message);
      setPhaseBoth('idle');
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

  const speakCurrentWord = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = currentAssociationRef.current;
    if (!current) return;
    sttRef.current.abort();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.definition : current.term;
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    lastCommandRef.current = null;
    setPhaseBoth('speaking');
    const spoke = await ttsRef.current.speak(word, languages.ttsLang, isReversed ? list.settings.voiceDefId : list.settings.voiceTermId, list.settings.voiceRate, list.settings.voicePitch);
    console.log('[GameVoice] speak provider=', list.settings.ttsProvider, 'voiceId=', isReversed ? list.settings.voiceDefId : list.settings.voiceTermId, 'word=', word, 'settingsKeys=', Object.keys(list.settings || {}));
    if (!shouldRunRef.current) return;
    if (!spoke.ok) {
      console.warn('[Voice] TTS failed:', word, 'voice=', spoke.voiceName, 'voices=', spoke.voicesCount);
    }
    setPhaseBoth('listening');
    answerHandledRef.current = false;
    listeningFailedRef.current = false;
    sttRef.current.start(languages.sttLang);
  }, [list.settings.flipOrder, list.settings.voiceTermId, list.settings.voiceDefId, list.settings.voiceRate, list.settings.voicePitch, languages.sttLang, setPhaseBoth]);

  const speakAnswer = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = currentAssociationRef.current;
    if (!current) return;
    sttRef.current.abort();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.term : current.definition;
    const lang = languages.sttLang;
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    lastCommandRef.current = null;
    setPhaseBoth('speaking');
    const spoke = await ttsRef.current.speak(word, lang, isReversed ? list.settings.voiceTermId : list.settings.voiceDefId, list.settings.voiceRate, list.settings.voicePitch);
    if (!shouldRunRef.current) return;
    if (!spoke.ok) {
      console.warn('[Voice] TTS failed:', word, 'voice=', spoke.voiceName, 'voices=', spoke.voicesCount);
    }
    setPhaseBoth('listening');
    answerHandledRef.current = false;
    listeningFailedRef.current = false;
    sttRef.current.start(languages.sttLang);
  }, [list.settings.flipOrder, list.settings.voiceTermId, list.settings.voiceDefId, list.settings.voiceRate, list.settings.voicePitch, languages.sttLang, setPhaseBoth]);

  useEffect(() => {
    if (enabled) {
      shouldRunRef.current = true;
    } else {
      shouldRunRef.current = false;
      clearFeedbackTimer();
      sttRef.current.abort();
      ttsRef.current.cancel();
      setPhaseBoth('idle');
      setTranscript('');
      setError(null);
    }
    return () => {
      shouldRunRef.current = false;
      clearFeedbackTimer();
      sttRef.current.abort();
      ttsRef.current.cancel();
    };
  }, [enabled, clearFeedbackTimer, setPhaseBoth]);

  useEffect(() => {
    if (!enabled || !audioRecordingEnabled) {
      console.log('[Audio] recorder disabled');
      abortRecording();
      return;
    }
    if (phase === 'listening') {
      console.log('[Audio] startRecording phase=', phase);
      startRecording();
    } else {
      console.log('[Audio] stopRecording phase=', phase);
      stopRecording();
    }
  }, [enabled, audioRecordingEnabled, phase, startRecording, stopRecording, abortRecording]);

  useEffect(() => {
    if (!shouldRunRef.current) return;
    if (feedback === 'correct') {
      clearFeedbackTimer();
      setPhaseBoth('feedback');
      void (async () => {
        const spoke = await ttsRef.current.speak('Correcto', languages.ttsLang, list.settings.voiceTermId, list.settings.voiceRate, list.settings.voicePitch);
        if (!shouldRunRef.current) return;
        if (!spoke.ok) {
          console.warn('[Voice] TTS feedback failed:', 'Correcto', 'voice=', spoke.voiceName);
        }
        feedbackTimerRef.current = setTimeout(() => {
          feedbackTimerRef.current = null;
          if (shouldRunRef.current) onAdvanceRef.current();
        }, FEEDBACK_DELAY_MS);
      })();
    } else if (feedback === 'incorrect') {
      clearFeedbackTimer();
      setPhaseBoth('feedback');
      void (async () => {
        const spoke = await ttsRef.current.speak('Incorrecto', languages.ttsLang, list.settings.voiceTermId, list.settings.voiceRate, list.settings.voicePitch);
        if (!shouldRunRef.current) return;
        if (!spoke.ok) {
          console.warn('[Voice] TTS feedback failed:', 'Incorrecto', 'voice=', spoke.voiceName);
        }
        feedbackTimerRef.current = setTimeout(() => {
          feedbackTimerRef.current = null;
          if (shouldRunRef.current) void speakCurrentWord();
        }, FEEDBACK_DELAY_MS);
      })();
    } else if (feedback === 'none') {
      void speakCurrentWord();
    }
  }, [feedback, evaluationCount, enabled, clearFeedbackTimer, setPhaseBoth, speakCurrentWord, currentAssociation?.id, languages.ttsLang, list.settings.voiceTermId, list.settings.voiceRate, list.settings.voicePitch]);

  useEffect(() => {
    if (feedback === 'correct' || feedback === 'incorrect') {
      const blob = pendingBlobRef.current;
      if (!blob || !currentAssociation) return;
      const userId = useGameStore.getState().user?.uid || '';
      const isReversed = list.settings.flipOrder === 'reversed';
      const term = isReversed ? currentAssociation.definition : currentAssociation.term;
      const transcript = transcriptRef.current;
      console.log('[Audio] uploading blobSize=', blob.size, 'term=', term, 'transcript=', transcript, 'correct=', feedback === 'correct');
      void uploadAudioRecording(blob, {
        userId,
        listId: list.id,
        associationId: currentAssociation.id,
        sessionId: sessionIdRef.current,
        term,
        transcript,
        correct: feedback === 'correct',
        timestamp: Date.now(),
      }).then((url) => {
        console.log('[Audio] upload ok url=', url);
      }).catch((error) => {
        console.error('[Audio] upload failed:', error);
      });
      pendingBlobRef.current = null;
    }
  }, [feedback, currentAssociation?.id, list.id, list.settings.flipOrder]);

  useEffect(() => {
    if (phaseRef.current !== 'listening') return;
    if (sttRef.current.isListening) return;
    if (answerHandledRef.current) return;
    if (listeningFailedRef.current) return;

    const timeout = setTimeout(() => {
      if (phaseRef.current !== 'listening') return;
      if (sttRef.current.isListening) return;
      if (answerHandledRef.current) return;
      if (listeningFailedRef.current) return;

      listeningFailedRef.current = true;
      const pending = transcriptRef.current.trim();
      if (pending) {
        onSubmitVoiceRef.current(pending);
      } else {
        setPhaseBoth('idle');
        setError('No speech detected.');
      }
    }, LISTENING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [phase, setPhaseBoth]);

  const repeat = useCallback(() => {
    clearFeedbackTimer();
    void speakCurrentWord();
  }, [clearFeedbackTimer, speakCurrentWord]);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    clearFeedbackTimer();
    sttRef.current.abort();
    ttsRef.current.cancel();
    setPhaseBoth('idle');
    setTranscript('');
    setError(null);
  }, [clearFeedbackTimer, setPhaseBoth]);

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
