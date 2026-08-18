export interface SttProvider {
  supported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  interimTranscript: string;
  recordingTimeLeft: number;
  recordingElapsed: number;
  maxRecordingSeconds: number;
  start(language: string | null): void;
  stop(): void;
  abort(): void;
}
