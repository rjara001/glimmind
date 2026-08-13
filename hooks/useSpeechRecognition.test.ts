import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

type MockRecognitionInstance = {
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onstart: (() => void) | null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
};

function createMockInstance(): MockRecognitionInstance {
  return {
    onresult: null,
    onend: null,
    onerror: null,
    onstart: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    continuous: false,
    interimResults: false,
    maxAlternatives: 0,
    lang: '',
  };
}

describe('useSpeechRecognition', () => {
  let mockInstance: MockRecognitionInstance;
  let MockConstructor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInstance = createMockInstance();
    MockConstructor = vi.fn(() => mockInstance);
    (window as any).SpeechRecognition = MockConstructor;
    (window as any).webkitSpeechRecognition = MockConstructor;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onInterim with interim transcript', async () => {
    const onInterim = vi.fn();
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal, onInterim }));

    await act(async () => {
      result.current.start('en');
    });

    mockInstance.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: false, length: 1, 0: { transcript: 'hello', confidence: 0.9 } },
      ],
    });

    expect(onInterim).toHaveBeenCalledWith('hello');
    expect(onFinal).not.toHaveBeenCalled();
  });

  it('calls onFinal with final transcript', async () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      result.current.start('en');
    });

    mockInstance.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, length: 1, 0: { transcript: 'hello world', confidence: 0.9 } },
      ],
    });

    expect(onFinal).toHaveBeenCalledWith('hello world');
  });

  it('does not call onInterim when interim is empty', async () => {
    const onInterim = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onInterim, onFinal: vi.fn() }));

    await act(async () => {
      result.current.start('en');
    });

    mockInstance.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: false, length: 1, 0: { transcript: '', confidence: 0 } },
      ],
    });

    expect(onInterim).not.toHaveBeenCalled();
  });

  it('prevents auto-restart after intentional stop', async () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      result.current.start('en');
    });

    await act(async () => {
      result.current.stop();
    });

    mockInstance.onend?.();

    expect(mockInstance.start).toHaveBeenCalledTimes(1);
  });

  it('prevents auto-restart after intentional abort', async () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      result.current.start('en');
    });

    await act(async () => {
      result.current.abort();
    });

    mockInstance.onend?.();

    expect(mockInstance.start).toHaveBeenCalledTimes(1);
  });

  it('allows auto-restart when onend fires without intentional stop', async () => {
    vi.useFakeTimers();
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      result.current.start('en');
    });

    mockInstance.onend?.();

    expect(mockInstance.start).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(mockInstance.start).toHaveBeenCalledTimes(2);
  });
});
