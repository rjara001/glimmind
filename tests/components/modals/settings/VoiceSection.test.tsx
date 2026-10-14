import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoiceSection } from '@/components/modals/settings/VoiceSection';

vi.mock('@/hooks/voice/tts/useChirpVoices', () => ({
  useChirpVoices: () => ({
    voices: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

function renderSection({ isPremium }: { isPremium: boolean }) {
  return render(
    <VoiceSection
      isPremium={isPremium}
      isVoiceEnabled={true}
      onVoiceEnabledToggle={vi.fn()}
      ttsProvider="browser"
      onTtsProviderChange={vi.fn()}
      sttProvider="browser"
      onSttProviderChange={vi.fn()}
      isVoskReady={true}
      draft={{}}
      onDraftChange={vi.fn()}
      voices={[]}
      termLabel="Término"
      defLabel="Definición"
      onPlayTestVoice={vi.fn()}
    />
  );
}

describe('VoiceSection premium gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the cloud voice providers from a free account', () => {
    renderSection({ isPremium: false });

    expect(screen.queryByRole('button', { name: 'Chirp 3 HD' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chiptt' })).not.toBeInTheDocument();
  });

  it('keeps the on-device providers available to a free account', () => {
    renderSection({ isPremium: false });

    expect(screen.getAllByRole('button', { name: 'Browser' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Vosk' })).toBeInTheDocument();
  });

  it('offers the cloud voice providers to a premium account', () => {
    renderSection({ isPremium: true });

    expect(screen.getByRole('button', { name: 'Chirp 3 HD' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chiptt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vosk' })).toBeInTheDocument();
  });
});
