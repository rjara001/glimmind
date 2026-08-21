import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Association, AssociationList, VoiceCommandId, VoiceCommandsConfig } from '../../types';
import { useSpeechSynthesis } from './tts/useSpeechSynthesis';
import { useSpeechRecognition } from './stt/useSpeechRecognition';
import { useAudioRecorder } from './useAudioRecorder';
import { uploadAudioRecording } from '../../services/audioService';
import { useGameStore } from '../../store/gameStore';
import { resolveVoiceLanguages } from '../../services/voice/languages';
import { isExactExpectedAnswer } from '../../services/voice/stt/earlyMatch';
import {
  matchVoiceCommand,
  matchExactVoiceCommand,
  resolveVoiceCommands,
  getAllVoiceCommandWords,
} from '../../services/voice/stt/commands';
import { LISTENING_TIMEOUT_MS, FEEDBACK_DELAY_MS, RELISTEN_DELAY_MS, VOSK_MIN_COMMAND_CONFIDENCE } from '../../constants/voice';

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

  useEffect(() => { currentAssociationRef.current = currentAssociation; }, [currentAssociation]);
  useEffect(() => { onSubmitVoiceRef.current = onSubmitVoice; }, [onSubmitVoice]);
  useEffect(() => { onAdvanceRef.current = onAdvance; }, [onAdvance]);
  useEffect(() => { commandsRef.current = resolveVoiceCommands(commands); }, [commands]);
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);
  useEffect(() => { revealedRef.current = revealed; }, [revealed]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const setPhaseBoth = useCallback((next: GameVoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

const commandWords = useMemo(
  () => getAllVoiceCommandWords(commands),
  [commands],
);

const expectedWords = useMemo(() => {
  if (!currentAssociation) return undefined;

  // If flipOrder is 'reversed', the definition is shown -> the hidden answer is the 'term'.
  // If flipOrder is 'normal', the term is shown -> the hidden answer is the 'definition'.
  const isReversed = list.settings.flipOrder === 'reversed';
  const hiddenAnswer = isReversed ? currentAssociation.term : currentAssociation.definition;

  // Voice commands are added as expected words so Vosk's constrained grammar
  // recognizes them during listening.
  return [hiddenAnswer, ...commandWords];
}, [currentAssociation, list.settings.flipOrder, commandWords]);

  const languages = useMemo(
    () =>
      resolveVoiceLanguages(list.concept, list.settings.flipOrder, {
        termLang: list.settings.voiceTermLang,
        defLang: list.settings.voiceDefLang,
      }),
    [list.concept, list.settings.flipOrder, list.settings.voiceTermLang, list.settings.voiceDefLang],
  );

  const tts = useSpeechSynthesis(list.settings.ttsProvider || 'browser');
  const stt = useSpeechRecognition({
    provider: list.settings.sttProvider || 'browser',
    expectedWords,
    commandWords,
    minCommandConfidence: VOSK_MIN_COMMAND_CONFIDENCE,
    onInterim: (text) => {
      if (answerHandledRef.current) return;
      const current = currentAssociationRef.current;
      if (!current || phaseRef.current !== 'listening' || revealedRef.current) return;

      const isReversed = list.settings.flipOrder === 'reversed';
      const expected = isReversed ? current.definition : current.term;

      if (isExactExpectedAnswer(text, expected)) {
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
        lastCommandRef.current = exactCommand;
        onCommandRef.current?.(exactCommand);
      }
    },
    onFinal: (text) => {
      const trimmed = text.trim();
      if (!trimmed || answerHandledRef.current) return;

      setTranscript(trimmed);
      transcriptRef.current = trimmed;

      const matched = matchVoiceCommand(trimmed, commandsRef.current);
      if (matched) {
        if (lastCommandRef.current === matched) return;
        lastCommandRef.current = matched;
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
      if (phaseRef.current !== 'listening') return;
      const isNoSpeech = message.startsWith('No speech detected');
      if (isNoSpeech) {
        setError(null);
        setTimeout(() => {
          if (!shouldRunRef.current || phaseRef.current !== 'listening' || answerHandledRef.current) return;
          sttRef.current.start(languages.sttLang);
        }, RELISTEN_DELAY_MS);
        return;
      }
      setError(message);
      setPhaseBoth('idle');
    },
  });

  const ttsRef = useRef(tts);
  useEffect(() => { ttsRef.current = tts; }, [tts]);

  const sttRef = useRef(stt);
  useEffect(() => { sttRef.current = stt; }, [stt]);

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

    const spoke = await ttsRef.current.speak(
      word, 
      languages.ttsLang, 
      isReversed ? list.settings.voiceDefId : list.settings.voiceTermId, 
      list.settings.voiceRate, 
      list.settings.voicePitch
    );

    if (!shouldRunRef.current) return;
    if (!spoke.ok) {
      console.warn('[Voice] TTS failed:', word);
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

    const spoke = await ttsRef.current.speak(
      word, 
      lang, 
      isReversed ? list.settings.voiceTermId : list.settings.voiceDefId, 
      list.settings.voiceRate, 
      list.settings.voicePitch
    );

    if (!shouldRunRef.current) return;
    if (!spoke.ok) {
      console.warn('[Voice] TTS failed:', word);
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
      abortRecording();
      return;
    }
    if (phase === 'listening') {
      startRecording();
    } else {
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
          console.warn('[Voice] TTS feedback failed:', 'Correcto');
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
          console.warn('[Voice] TTS feedback failed:', 'Incorrecto');
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
      void uploadAudioRecording(blob, {
        userId,
        listId: list.id,
        associationId: currentAssociation.id,
        sessionId: sessionIdRef.current,
        term,
        transcript,
        correct: feedback === 'correct',
        timestamp: Date.now(),
      }).catch((err) => {
        console.error('[Audio] upload failed:', err);
      });
      pendingBlobRef.current = null;
    }
  }, [feedback, currentAssociation?.id, list.id, list.settings.flipOrder]);

  useEffect(() => {
    if (phaseRef.current !== 'listening') return;

    if (sttRef.current.isListening) return;
    if (sttRef.current.isProcessing) return;
    if (answerHandledRef.current) return;
    if (listeningFailedRef.current) return;

    const timeout = setTimeout(() => {
      if (phaseRef.current !== 'listening') return;
      if (sttRef.current.isListening) return;
      if (sttRef.current.isProcessing) return;
      if (answerHandledRef.current) return;
      if (listeningFailedRef.current) return;

      listeningFailedRef.current = true;
      const pending = transcriptRef.current.trim();
      if (pending) {
        onSubmitVoiceRef.current(pending);
      } else {
        setPhaseBoth('idle');
        setError('No speech detected (listening timeout, useGameVoice).');
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
    isProcessing: stt.isProcessing,
    supported: stt.supported,
    repeat,
    speakAnswer,
    stop,
  };
}