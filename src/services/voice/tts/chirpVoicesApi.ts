import { callFunction } from '../../callFunction';
import { ChirpVoice } from '../../../types';

export interface ListTtsVoicesResponse {
  voices: ChirpVoice[];
}

export async function listTtsVoices(): Promise<ChirpVoice[]> {
  const result = await callFunction<ListTtsVoicesResponse>('listTtsVoices', {});
  return result.voices || [];
}
