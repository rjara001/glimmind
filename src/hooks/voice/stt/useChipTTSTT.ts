import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { transcribeSpeech } from '../../../services/voice/stt/chipttStt';
import { SttProvider } from '../../../types/stt';

const MAX_RECORDING_SECONDS = 20;
const TICK_INTERVAL_MS = 200;

const SILENCE_THRESHOLD = 0.01;
const MIN_SILENCE_DURATION_MS = 1500;
const MIN_RECORDING_TIME_MS = 500;
const ANALYSIS_INTERVAL_MS = 100;

export interface UseChipTTSTTOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
}

export function useChipTTSTT({ onFinal, onInterim, onError }: UseChipTTSTTOptions): SttProvider {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof MediaRecorder !== 'undefined';

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(MAX_RECORDING_SECONDS);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const recordingElapsedRef = useRef(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const langRef = useRef<string | null>(null);
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const silenceStartTimeRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const calculateRMS = useCallback((analyser: AnalyserNode): number => {
    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const normalized = (buffer[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / buffer.length);
  }, []);

  const startVAD = useCallback(
    (stream: MediaStream) => {
      hasSpokenRef.current = false;
      silenceStartTimeRef.current = null;
      recordingStartTimeRef.current = Date.now();

      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        vadIntervalRef.current = setInterval(() => {
          const currentAnalyser = analyserRef.current;
          if (!currentAnalyser) return;

          const rms = calculateRMS(currentAnalyser);
          const now = Date.now();
          const elapsedSinceStart = now - recordingStartTimeRef.current;

          if (rms > SILENCE_THRESHOLD) {
            hasSpokenRef.current = true;
            silenceStartTimeRef.current = null;
            return;
          }

          if (elapsedSinceStart < MIN_RECORDING_TIME_MS) {
            silenceStartTimeRef.current = null;
            return;
          }

          if (!hasSpokenRef.current) {
            const totalSilence = elapsedSinceStart - MIN_RECORDING_TIME_MS;
            if (totalSilence >= MIN_SILENCE_DURATION_MS) {
              const recorder = recorderRef.current;
              if (recorder && recorder.state !== 'inactive') {
                
                recorder.stop();
              }
              clearTimer();
            }
            return;
          }

          if (silenceStartTimeRef.current === null) {
            silenceStartTimeRef.current = now;
            return;
          }

          const silenceDuration = now - silenceStartTimeRef.current;
          if (silenceDuration >= MIN_SILENCE_DURATION_MS) {
            const recorder = recorderRef.current;
            if (recorder && recorder.state !== 'inactive') {
              
              recorder.stop();
            }
            clearTimer();
          }
        }, ANALYSIS_INTERVAL_MS);
      } catch (error) {
        console.error('[Chiptt] VAD setup failed:', error);
      }
    },
    [clearTimer, calculateRMS],
  );

  const cleanup = useCallback(() => {
    clearTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    chunksRef.current = [];
    setIsListening(false);
    isListeningRef.current = false;
    setIsProcessing(false);
    isProcessingRef.current = false;
    setRecordingTimeLeft(MAX_RECORDING_SECONDS);
    setRecordingElapsed(0);
  }, [clearTimer]);

  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error('Failed to encode audio blob.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read audio blob.'));
    });
  }, []);

  const transcribeExistingAudio = useCallback(
    async (blob: Blob, languageCode?: string): Promise<string> => {
      if (!supported) {
        throw new Error('Chirp STT not supported in this browser.');
      }

      const base64 = await blobToBase64(blob);
      const encoding = blob.type.includes('ogg')
        ? 'OGG_OPUS'
        : blob.type.includes('opus')
          ? 'WEBM_OPUS'
          : 'WEBM';

      const result = await transcribeSpeech({
        audioContent: base64,
        encoding,
        sampleRateHertz: 48000,
        languageCode: languageCode || undefined,
        audioDuration: Math.max(1, Math.min(Math.ceil(60), 60)),
      });

      if (result.noSpeech) {
        throw new Error(result.message || 'No speech detected.');
      }

      const trimmed = result.transcript?.trim();
      if (!trimmed) {
        throw new Error('No speech detected.');
      }

      return trimmed;
    },
    [supported, blobToBase64],
  );

  const start = useCallback(
    (lang: string | null) => {
      if (!supported || isListeningRef.current || isProcessingRef.current) return;

      cleanup();

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          langRef.current = lang;
          chunksRef.current = [];

          const mimeType =
            MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : 'audio/webm';

          const recorder = new MediaRecorder(stream, { mimeType });
          recorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };

          recorder.onstop = () => {
            const recordedLang = langRef.current;
            const recordedChunks = chunksRef.current;
            chunksRef.current = [];

            setIsListening(false);
            isListeningRef.current = false;
            setIsProcessing(true);
            isProcessingRef.current = true;
            clearTimer();

            if (recordedChunks.length === 0) {
              setIsProcessing(false);
              isProcessingRef.current = false;
              onErrorRef.current?.('No audio captured.');
              return;
            }

            const blob = new Blob(recordedChunks, { type: mimeType });

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              const base64 = dataUrl.split(',')[1];
              if (!base64) {
                setIsProcessing(false);
                isProcessingRef.current = false;
                onErrorRef.current?.('Failed to encode audio.');
                return;
              }

              const encoding = mimeType.includes('ogg')
                ? 'OGG_OPUS'
                : mimeType.includes('opus')
                  ? 'WEBM_OPUS'
                  : 'WEBM';

              const audioDuration = Math.max(1, Math.min(Math.ceil(recordingElapsedRef.current), MAX_RECORDING_SECONDS));

              void transcribeSpeech({
                audioContent: base64,
                encoding,
                sampleRateHertz: 48000,
                languageCode: recordedLang || undefined,
                audioDuration,
              })
                .then((result) => {
                  if (!isProcessingRef.current) return;
                  if (result.noSpeech) {
                    onErrorRef.current?.(result.message || 'No speech detected.');
                    return;
                  }
                  const trimmed = result.transcript?.trim();
                  if (trimmed) {
                    onFinalRef.current(trimmed);
                  } else {
                    onErrorRef.current?.('No speech detected.');
                  }
                })
                .catch((error) => {
                  if (!isProcessingRef.current) return;
                  console.error('[Chiptt] transcribeSpeech failed:', error);
                  onErrorRef.current?.(error instanceof Error ? error.message : 'STT error.');
                })
                .finally(() => {
                  setIsProcessing(false);
                  isProcessingRef.current = false;
                });
            };

            reader.onerror = () => {
              setIsProcessing(false);
              isProcessingRef.current = false;
              onErrorRef.current?.('Failed to read audio.');
            };
          };

          recorder.onerror = () => {
            if (!isListeningRef.current) return;
            cleanup();
            onErrorRef.current?.('Recording error.');
          };

          recorder.start();
          setIsListening(true);
          isListeningRef.current = true;
          setIsProcessing(false);
          isProcessingRef.current = false;
          setRecordingTimeLeft(MAX_RECORDING_SECONDS);
          setRecordingElapsed(0);

          startVAD(stream);

          tickRef.current = setInterval(() => {
            if (!isListeningRef.current) return;
            setRecordingElapsed((prev) => {
              const next = prev + TICK_INTERVAL_MS / 1000;
              const rounded = Math.floor(next);
              recordingElapsedRef.current = next;
              setRecordingTimeLeft(Math.max(0, MAX_RECORDING_SECONDS - rounded));
              return next;
            });
          }, TICK_INTERVAL_MS);

          timerRef.current = setTimeout(() => {
            if (!isListeningRef.current) return;
            recorder.stop();
          }, MAX_RECORDING_SECONDS * 1000);
        })
        .catch((error) => {
          console.error('[Chiptt] getUserMedia failed:', error);
          onErrorRef.current?.(error instanceof Error ? error.message : 'Microphone access denied.');
        });
    },
    [supported, cleanup, clearTimer, startVAD],
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const abort = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return useMemo(
    () => ({
      supported,
      isListening,
      isProcessing,
      interimTranscript: '',
      recordingTimeLeft,
      recordingElapsed,
      maxRecordingSeconds: MAX_RECORDING_SECONDS,
      start,
      stop,
      abort,
      transcribeExistingAudio,
    }),
    [supported, isListening, isProcessing, recordingTimeLeft, recordingElapsed, start, stop, abort, transcribeExistingAudio],
  );
}
