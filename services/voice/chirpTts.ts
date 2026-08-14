import { callFunction } from '../../services/callFunction';

export interface ChirpSynthesizeResponse {
  audioContent: string;
}

export async function synthesizeSpeech(
  text: string,
  voiceId: string,
  rate?: number,
  pitch?: number,
): Promise<ChirpSynthesizeResponse> {
  return callFunction<ChirpSynthesizeResponse>('synthesizeSpeech', { text, voiceId, rate, pitch });
}
