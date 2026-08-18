import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudioRecorderOptions {
  enabled?: boolean;
  onRecordingAvailable?: (blob: Blob) => void;
}

export function useAudioRecorder({ enabled = false, onRecordingAvailable }: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onRecordingAvailableRef = useRef(onRecordingAvailable);

  useEffect(() => {
    onRecordingAvailableRef.current = onRecordingAvailable;
  }, [onRecordingAvailable]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Ignore stop errors
      }
    }
  }, []);

  const abortRecording = useCallback(() => {
    stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (!enabled) return;
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        setIsRecording(false);
        onRecordingAvailableRef.current?.(blob);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        recorderRef.current = null;
      };

      recorder.onerror = () => {
        setError('Audio recording error.');
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone permission denied or not available.');
      setIsRecording(false);
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      abortRecording();
    };
  }, [abortRecording]);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    abortRecording,
  };
}
