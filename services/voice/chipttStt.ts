import { callFunction } from '../../services/callFunction';

export interface ChipttTranscribeResponse {
  transcript?: string;
  noSpeech?: boolean;
  message?: string;
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
