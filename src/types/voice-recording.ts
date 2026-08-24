export interface VoiceRecording {
  id: string;
  userId: string;
  listId: string;
  audioBase64: string;
  mimeType: string;
  transcript: string;
  sttProvider: string;
  languageCode?: string;
  durationSeconds: number;
  createdAt: number;
}
