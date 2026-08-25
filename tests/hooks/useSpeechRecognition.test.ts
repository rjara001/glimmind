import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '@/hooks/voice/stt/useSpeechRecognition';
import * as chipttModule from '@/hooks/voice/stt/useChipTTSTT';

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
    vi.restoreAllMocks();
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
    vi.useFakeTimers();
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

    // onFinal is debounced — not emitted immediately
    expect(onFinal).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onFinal).toHaveBeenCalledWith('hello world');
  });

  it('accumulates multi-word final results (mobile) before emitting onFinal once', async () => {
    vi.useFakeTimers();
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal }));

    await act(async () => {
      result.current.start('en');
    });

    // Mobile: first word arrives already marked isFinal
    mockInstance.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, length: 1, 0: { transcript: 'hola', confidence: 0.9 } },
      ],
    });

    expect(onFinal).not.toHaveBeenCalled();

    // Second event with both words final
    mockInstance.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, length: 1, 0: { transcript: 'hola', confidence: 0.9 } },
        { isFinal: true, length: 1, 0: { transcript: ' mundo', confidence: 0.9 } },
      ],
    });

    expect(onFinal).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith('hola mundo');
  });

  it('emits accumulated final on onend when debounce has not fired', async () => {
    vi.useFakeTimers();
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

    // Fire onend without advancing the debounce timer
    mockInstance.onend?.();

    expect(onFinal).toHaveBeenCalledWith('hello world');
  });

  it('does not emit onFinal twice when debounce and onend both fire', async () => {
    vi.useFakeTimers();
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

    // Debounce fires first
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Then onend fires — buffer is already empty, should not emit again
    mockInstance.onend?.();

    expect(onFinal).toHaveBeenCalledTimes(1);
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

  it('delegates start/stop/abort to useChipTTSTT when provider is chiptt', async () => {
    const mockChipttStart = vi.fn();
    const mockChipttStop = vi.fn();
    const mockChipttAbort = vi.fn();

    vi.spyOn(chipttModule, 'useChipTTSTT').mockReturnValue({
      supported: true,
      isListening: false,
      isProcessing: false,
      interimTranscript: '',
      recordingTimeLeft: 0,
      recordingElapsed: 0,
      maxRecordingSeconds: 0,
      start: mockChipttStart,
      stop: mockChipttStop,
      abort: mockChipttAbort,
    });

    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal, provider: 'chiptt' }));

    await act(async () => {
      result.current.start('es');
    });

    expect(mockChipttStart).toHaveBeenCalledWith('es');

    await act(async () => {
      result.current.stop();
    });

    expect(mockChipttStop).toHaveBeenCalled();

    await act(async () => {
      result.current.abort();
    });

    expect(mockChipttAbort).toHaveBeenCalled();
  });
});
