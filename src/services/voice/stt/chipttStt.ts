import { callFunction } from '../../callFunction';

export interface ChipttTranscribeResponse {
  transcript?: string;
  noSpeech?: boolean;
  message?: string;
  metadata?: {
    totalBilledDuration?: string;
    requestId?: string;
  };
}

export interface ChipttTranscribeOptions {
  audioContent: string;
  encoding?: string;
  sampleRateHertz?: number;
  languageCode?: string;
  audioDuration?: number;
}

export async function transcribeSpeech(
  options: ChipttTranscribeOptions,
): Promise<ChipttTranscribeResponse> {
  return callFunction<ChipttTranscribeResponse>('transcribeSpeech', options);
}

export interface ChipttExistingAudioOptions {
  audioContent: string;
  languageCode?: string;
  audioDuration?: number;
}

export async function transcribeExistingAudio(
  options: ChipttExistingAudioOptions,
): Promise<ChipttTranscribeResponse> {
  return callFunction<ChipttTranscribeResponse>('transcribeExistingAudio', options);
}

export interface ChipttChirp3Options {
  audioContent: string;
  languageCode?: string;
  audioDuration?: number;
}

export async function transcribeChirp3(
  options: ChipttChirp3Options,
): Promise<ChipttTranscribeResponse> {
  return callFunction<ChipttTranscribeResponse>('transcribeChirp3', options);
}
