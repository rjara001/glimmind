import type { SttProviderType, VoiceProvider } from '../../types';
import type { UserTier } from '../../types/quota';

// Rule 0 (BUSINESS_MODEL §1/§4): cloud voice engines are Premium-only, so a
// free account resolves any stored cloud provider back to the on-device one.
const DEFAULT_TTS_PROVIDER: VoiceProvider = 'browser';
const DEFAULT_STT_PROVIDER: SttProviderType = 'browser';
const CLOUD_TTS_PROVIDER: VoiceProvider = 'chirp';
const CLOUD_STT_PROVIDER: SttProviderType = 'chiptt';

export function resolveEffectiveTtsProvider(
  provider: VoiceProvider | undefined,
  tier: UserTier | null | undefined
): VoiceProvider {
  if (provider === undefined) return DEFAULT_TTS_PROVIDER;
  if (provider === CLOUD_TTS_PROVIDER && tier !== 'premium') return DEFAULT_TTS_PROVIDER;
  return provider;
}

export function resolveEffectiveSttProvider(
  provider: SttProviderType | undefined,
  tier: UserTier | null | undefined
): SttProviderType {
  if (provider === undefined) return DEFAULT_STT_PROVIDER;
  if (provider === CLOUD_STT_PROVIDER && tier !== 'premium') return DEFAULT_STT_PROVIDER;
  return provider;
}
