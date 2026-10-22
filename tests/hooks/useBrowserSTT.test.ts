import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBrowserSTT } from '../../src/hooks/voice/stt/useBrowserSTT';

interface MockAlternative {
  transcript: string;
  confidence?: number;
}

interface MockResult {
  isFinal: boolean;
  length: number;
  0: MockAlternative;
}

interface MockRecognitionEvent {
  resultIndex: number;
  results: MockResult[];
}

class MockRecognition {
  static last: MockRecognition | null = null;

  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: MockRecognitionEvent) => void) | null = null;
  started = false;

  constructor() {
    MockRecognition.last = this;
  }

  start(): void {
    this.started = true;
    this.onstart?.();
  }

  stop(): void {
    this.started = false;
    this.onend?.();
  }

  abort(): void {
    this.started = false;
  }

  emitFinals(transcripts: string[], resultIndex = 0): void {
    const results: MockResult[] = transcripts.map((transcript) => ({
      isFinal: true,
      length: 1,
      0: { transcript, confidence: 1 },
    }));
    this.onresult?.({ resultIndex, results });
  }
}

function lastRecognition(): MockRecognition {
  const instance = MockRecognition.last;
  if (!instance) throw new Error('MockRecognition was never constructed');
  return instance;
}

describe('useBrowserSTT', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockRecognition.last = null;
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: MockRecognition,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    Reflect.deleteProperty(window, 'webkitSpeechRecognition');
  });

  it('emits one onFinal with the complete phrase for mobile word-by-word finals', () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useBrowserSTT({ onFinal }));

    act(() => {
      result.current.start('en-US');
    });

    // Mobile: each word arrives as its own isFinal result.
    act(() => {
      lastRecognition().emitFinals([' good']);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      lastRecognition().emitFinals(['good', ' morning'], 1);
    });
    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith('good morning');
  });

  it('flushes the accumulated final on onend before the silence window', () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useBrowserSTT({ onFinal }));

    act(() => {
      result.current.start('en-US');
    });
    act(() => {
      lastRecognition().emitFinals(['hola']);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      lastRecognition().onend?.();
    });

    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith('hola');
  });

  it('does not re-emit already-flushed results when later words arrive', () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useBrowserSTT({ onFinal }));

    act(() => {
      result.current.start('en-US');
    });
    act(() => {
      lastRecognition().emitFinals(['one']);
    });
    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith('one');

    // Same session continues: old finals are still in results but past the
    // flush cursor, so only the new word is emitted.
    act(() => {
      lastRecognition().emitFinals(['one', ' two'], 1);
    });
    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(onFinal).toHaveBeenCalledTimes(2);
    expect(onFinal).toHaveBeenLastCalledWith('two');
  });

  it('force-flushes at the utterance cap even when finals keep arriving', () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useBrowserSTT({ onFinal }));

    act(() => {
      result.current.start('en-US');
    });
    act(() => {
      lastRecognition().emitFinals(['a']);
    });
    act(() => {
      vi.advanceTimersByTime(1100);
      lastRecognition().emitFinals(['a', ' b'], 1);
    });
    act(() => {
      vi.advanceTimersByTime(1100);
      lastRecognition().emitFinals(['a', ' b', ' c'], 2);
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });

    // 3000 ms after the utterance started, the cap fires before the silence
    // debounce (which keeps being reset by the arriving finals).
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith('a b c');
  });

  it('does not emit anything for interim-only results', () => {
    const onFinal = vi.fn();
    const onInterim = vi.fn();
    const { result } = renderHook(() => useBrowserSTT({ onFinal, onInterim }));

    act(() => {
      result.current.start('en-US');
    });
    act(() => {
      lastRecognition().onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: false,
            length: 1,
            0: { transcript: 'hello wor', confidence: 1 },
          },
        ],
      });
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onInterim).toHaveBeenCalledWith('hello wor');
    expect(onFinal).not.toHaveBeenCalled();
  });
});
