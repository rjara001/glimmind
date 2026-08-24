import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { transcribeSpeech } from '../../services/voice/stt/chipttStt';
import { voiceRecordingService } from '../../services/voiceRecordingService';
import { VoiceRecording } from '../../types/voice-recording';

const TICK_INTERVAL_MS = 100;

export interface UseVoiceRecordingsOptions {
  userId: string;
  listId: string;
  enabled?: boolean;
}

export interface UseVoiceRecordingsResult {
  recordings: VoiceRecording[];
  isLoading: boolean;
  error: string | null;
  isRecording: boolean;
  currentTranscript: string;
  recordingDuration: number;
  deleteRecording: (id: string) => Promise<void>;
  downloadRecording: (recording: VoiceRecording) => void;
  refresh: () => Promise<void>;
}

export function useVoiceRecordings({
  userId,
  listId,
  enabled = false,
}: UseVoiceRecordingsOptions): UseVoiceRecordingsResult {
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

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

  const load = useCallback(async () => {
    if (!userId || !listId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await voiceRecordingService.getRecordings(userId, listId);
      setRecordings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading recordings');
    } finally {
      setIsLoading(false);
    }
  }, [userId, listId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (enabled) {
      durationRef.current = 0;
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        durationRef.current += TICK_INTERVAL_MS / 1000;
        setRecordingDuration(durationRef.current);
      }, TICK_INTERVAL_MS);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleRecordingAvailable = useCallback(
    async (blob: Blob) => {
      stopTimer();
      setRecordingDuration(durationRef.current);
      setCurrentTranscript('');
      setError(null);
      setIsRecording(false);

      try {
        const base64 = await blobToBase64(blob);
        const encoding = blob.type.includes('ogg')
          ? 'OGG_OPUS'
          : blob.type.includes('opus')
            ? 'WEBM_OPUS'
            : 'WEBM';

        console.log('[VoiceRecording] blob size:', blob.size, 'encoding:', encoding, 'duration:', durationRef.current);

        const result = await transcribeSpeech({
          audioContent: base64,
          encoding,
          sampleRateHertz: 48000,
          languageCode: undefined,
          audioDuration: Math.max(1, Math.ceil(durationRef.current)),
        });

        console.log('[VoiceRecording] transcribeSpeech result:', result);

        if (result.noSpeech) {
          setError(result.message || 'No speech detected.');
          return;
        }

        const trimmed = result.transcript?.trim() || '';
        setCurrentTranscript(trimmed);

        const recording: Omit<VoiceRecording, 'id'> = {
          userId,
          listId,
          audioBase64: base64,
          mimeType: blob.type || 'audio/webm',
          transcript: trimmed,
          sttProvider: 'chiptt',
          durationSeconds: Number(durationRef.current.toFixed(1)),
          createdAt: Date.now(),
        };

        const id = await voiceRecordingService.addRecording(recording);
        setRecordings((prev) => [
          { ...recording, id, createdAt: recording.createdAt },
          ...prev,
        ]);
      } catch (err) {
        console.error('[VoiceRecording] error:', err);
        setError(err instanceof Error ? err.message : 'STT error');
      }
    },
    [userId, listId, blobToBase64, stopTimer],
  );

  const { startRecording, stopRecording } =
    useAudioRecorder({
      enabled: Boolean(userId && listId && enabled),
      onRecordingAvailable: handleRecordingAvailable,
    });

  useEffect(() => {
    if (enabled) {
      durationRef.current = 0;
      setRecordingDuration(0);
      setError(null);
      setCurrentTranscript('');
      setIsRecording(true);
      void startRecording();
    } else {
      stopTimer();
      setIsRecording(false);
      void stopRecording();
    }
    return stopTimer;
  }, [enabled, startRecording, stopRecording, stopTimer]);

  const handleDeleteRecording = useCallback(
    async (id: string) => {
      if (!userId) return;
      await voiceRecordingService.deleteRecording(userId, id);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    },
    [userId],
  );

  const handleDownloadRecording = useCallback(
    (recording: VoiceRecording) => {
      const byteCharacters = atob(recording.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i += 1) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: recording.mimeType || 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `recording-${recording.id}.webm`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },
    [],
  );

  return {
    recordings,
    isLoading,
    error,
    isRecording,
    currentTranscript,
    recordingDuration,
    deleteRecording: handleDeleteRecording,
    downloadRecording: handleDownloadRecording,
    refresh: load,
  };
}
