export type SttProviderId = 'browser' | 'google-streaming' | 'vosk';

export interface SttTestResult {
  provider: SttProviderId;
  expected: string;
  heard: string;
  matched: boolean;
  latencyMs: number;
  timestamp: number;
}

export interface UseSttProviderSwitchOptions {
  activeProvider: SttProviderId;
  expectedWords: string[];
  onResult?: (result: SttTestResult) => void;
}

export interface SttProviderSwitchState {
  activeProvider: SttProviderId;
  isListening: boolean;
  isReady: boolean;
  partial: string;
  start: () => void;
  stop: () => void;
  results: SttTestResult[];
}

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
  transcribeExistingAudio?(blob: Blob, languageCode?: string): Promise<string>;
}
