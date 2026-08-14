import { callFunction } from '../../services/callFunction';

export interface ChipttTranscribeResponse {
  transcript: string;
}

export interface ChipttTranscribeOptions {
  audioContent: string;
  encoding?: string;
  sampleRateHertz?: number;
  languageCode?: string;
}

export async function transcribeSpeech(
  options: ChipttTranscribeOptions,
): Promise<ChipttTranscribeResponse> {
  return callFunction<ChipttTranscribeResponse>('transcribeSpeech', options);
}
