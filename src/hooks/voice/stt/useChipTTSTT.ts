import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { transcribeChirp3, transcribeSpeech } from '../../../services/voice/stt/chipttStt';
import { SttProvider } from '../../../types/stt';

const MAX_RECORDING_SECONDS = 20;
const TICK_INTERVAL_MS = 100;

const MEDIA_RECORDER_MIME_TYPE = 'audio/webm;codecs=opus';

const MIN_RECORDING_MS = 1200;
const SILENCE_THRESHOLD = 14;
const SILENCE_DURATION_MS = 850;

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
  const [interimTranscript] = useState('');
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(MAX_RECORDING_SECONDS);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceCheckIdRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const langRef = useRef<string | null>(null);
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingElapsedRef = useRef(0);
  const silenceStartRef = useRef<number>(Date.now());
  const hasSpokenRef = useRef(false);

  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (silenceCheckIdRef.current !== null) {
      cancelAnimationFrame(silenceCheckIdRef.current);
      silenceCheckIdRef.current = null;
    }
  }, []);

  const stopStreamTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const closeAudioContext = useCallback(() => {
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

  const resetStateFlags = useCallback(() => {
    setIsListening(false);
    isListeningRef.current = false;
    setIsProcessing(false);
    isProcessingRef.current = false;
    setRecordingTimeLeft(MAX_RECORDING_SECONDS);
    setRecordingElapsed(0);
    recordingElapsedRef.current = 0;
    hasSpokenRef.current = false;
  }, []);

  const cleanup = useCallback(() => {
    clearTimer();
    closeAudioContext();

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;

    stopStreamTracks();
    chunksRef.current = [];
    resetStateFlags();
  }, [clearTimer, closeAudioContext, stopStreamTracks, resetStateFlags]);

  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        if (base64) resolve(base64);
        else reject(new Error('Failed to encode audio blob.'));
      };
      reader.onerror = () => reject(new Error('Failed to read audio blob.'));
    });
  }, []);

  const transcribeExistingAudio = useCallback(
    async (blob: Blob, languageCode?: string): Promise<string> => {
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
        audioDuration: 60,
      });

      if (result.noSpeech) {
        throw new Error(result.message || 'No speech detected in existing audio.');
      }

      const trimmed = result.transcript?.trim();
      if (!trimmed) {
        throw new Error('No speech detected in existing audio transcript.');
      }

      return trimmed;
    },
    [blobToBase64],
  );

  const start = useCallback(
    (lang: string | null) => {
      if (!supported || isListeningRef.current || isProcessingRef.current) return;

      intentionalStopRef.current = false;
      cleanup();
      langRef.current = lang;

      navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        .then(async (stream) => {
          if (intentionalStopRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;
          chunksRef.current = [];

          const mimeType = MediaRecorder.isTypeSupported(MEDIA_RECORDER_MIME_TYPE)
            ? MEDIA_RECORDER_MIME_TYPE
            : 'audio/webm';

          const recorder = new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: 16000,
          });
          recorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };

          recorder.onstop = async () => {
            const recordedChunks = chunksRef.current;
            chunksRef.current = [];

            stopStreamTracks();
            closeAudioContext();
            clearTimer();

            setIsListening(false);
            isListeningRef.current = false;

            if (recordedChunks.length === 0 || intentionalStopRef.current) {
              resetStateFlags();
              if (!intentionalStopRef.current && recordedChunks.length === 0) {
                onErrorRef.current?.('No audio captured.');
              }
              return;
            }

            const elapsed = recordingElapsedRef.current;
            const hasSpeech = hasSpokenRef.current;

            // Validación previa al envío: resetea flags y notifica error sin bloquear UI
            if (elapsed < 0.8 || !hasSpeech) {
              resetStateFlags();
              onErrorRef.current?.('No speech detected.');
              return;
            }

            const blob = new Blob(recordedChunks, { type: mimeType });

            setIsProcessing(true);
            isProcessingRef.current = true;

            try {
              const base64 = await blobToBase64(blob);
              const result = await transcribeChirp3({
                audioContent: base64,
                languageCode: langRef.current || undefined,
                audioDuration: Math.max(1, Math.ceil(elapsed)),
              });

              if (!isProcessingRef.current) return;
              if (result.noSpeech) {
                onErrorRef.current?.(result.message || 'No speech detected in live transcription.');
                return;
              }

              const trimmed = result.transcript?.trim();
              if (trimmed) {
                onFinalRef.current(trimmed);
              } else {
                onErrorRef.current?.('No speech detected in live transcription result.');
              }
            } catch (error) {
              if (!isProcessingRef.current) return;
              onErrorRef.current?.(error instanceof Error ? error.message : 'STT error.');
            } finally {
              setIsProcessing(false);
              isProcessingRef.current = false;
            }
          };

          recorder.onerror = () => {
            stopStreamTracks();
            closeAudioContext();
            clearTimer();
            cleanup();
            onErrorRef.current?.('Recording error.');
          };

          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;

          // Forzar la reanudación del AudioContext si el navegador lo inició en "suspended"
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }

          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analyserRef.current = analyser;

          const startTime = Date.now();
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          silenceStartRef.current = Date.now();
          hasSpokenRef.current = false;

          const checkSilence = () => {
            if (!isListeningRef.current || !analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);
            const averageVolume = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;

            if (averageVolume >= SILENCE_THRESHOLD) {
              hasSpokenRef.current = true;
              silenceStartRef.current = Date.now();
            } else if (hasSpokenRef.current && Date.now() - startTime > MIN_RECORDING_MS) {
              if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
                if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                  try {
                    recorderRef.current.stop();
                  } catch {
                    // ignore
                  }
                }
                return;
              }
            }

            silenceCheckIdRef.current = requestAnimationFrame(checkSilence);
          };

          recorder.start();
          setIsListening(true);
          isListeningRef.current = true;
          setRecordingTimeLeft(MAX_RECORDING_SECONDS);
          setRecordingElapsed(0);
          recordingElapsedRef.current = 0;

          tickRef.current = setInterval(() => {
            if (!isListeningRef.current) return;
            recordingElapsedRef.current += TICK_INTERVAL_MS / 1000;
            const elapsed = recordingElapsedRef.current;
            setRecordingElapsed(elapsed);
            setRecordingTimeLeft(Math.max(0, MAX_RECORDING_SECONDS - Math.floor(elapsed)));
          }, TICK_INTERVAL_MS);

          timerRef.current = setTimeout(() => {
            if (!isListeningRef.current) return;
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
              try {
                recorderRef.current.stop();
              } catch {
                // ignore
              }
            }
          }, MAX_RECORDING_SECONDS * 1000);

          silenceCheckIdRef.current = requestAnimationFrame(checkSilence);
        })
        .catch((error) => {
          cleanup();
          onErrorRef.current?.(
            error instanceof Error ? error.message : 'Microphone access denied.',
          );
        });
    },
    [supported, cleanup, clearTimer, stopStreamTracks, closeAudioContext, blobToBase64, resetStateFlags],
  );

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    clearTimer();
    closeAudioContext();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    } else {
      stopStreamTracks();
      cleanup();
    }
  }, [clearTimer, closeAudioContext, cleanup, stopStreamTracks]);

  const abort = useCallback(() => {
    intentionalStopRef.current = true;
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return useMemo(
    () => ({
      supported,
      isListening,
      isProcessing,
      interimTranscript,
      recordingTimeLeft,
      recordingElapsed,
      maxRecordingSeconds: MAX_RECORDING_SECONDS,
      start,
      stop,
      abort,
      transcribeExistingAudio,
    }),
    [supported, isListening, isProcessing, interimTranscript, recordingTimeLeft, recordingElapsed, start, stop, abort, transcribeExistingAudio],
  );
}