import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { VoskModelProvider, useVoskModelContext } from '@/context/VoskModelContext';
import * as voskBrowser from 'vosk-browser';

const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz';

function createMockModel(): voskBrowser.Model {
  return { KaldiRecognizer: vi.fn() } as unknown as voskBrowser.Model;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <VoskModelProvider>{children}</VoskModelProvider>;
}

describe('VoskModelContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not download the model on mount', () => {
    const createModel = vi.spyOn(voskBrowser, 'createModel');

    renderHook(() => useVoskModelContext(), { wrapper });

    expect(createModel).not.toHaveBeenCalled();
  });

  it('exposes an empty state without a provider', () => {
    const { result } = renderHook(() => useVoskModelContext());

    expect(result.current.model).toBeNull();
    expect(result.current.isReady).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('downloads the model when load() is called', async () => {
    const mockModel = createMockModel();
    const createModel = vi.spyOn(voskBrowser, 'createModel').mockResolvedValue(mockModel);

    const { result } = renderHook(() => useVoskModelContext(), { wrapper });

    await act(async () => {
      await result.current.load();
    });

    expect(createModel).toHaveBeenCalledWith(MODEL_URL);
    expect(result.current.model).toBe(mockModel);
    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('calls createModel once when load() is invoked repeatedly', async () => {
    const createModel = vi.spyOn(voskBrowser, 'createModel').mockResolvedValue(createMockModel());

    const { result } = renderHook(() => useVoskModelContext(), { wrapper });

    await act(async () => {
      await Promise.all([result.current.load(), result.current.load()]);
    });
    await act(async () => {
      await result.current.load();
    });

    expect(createModel).toHaveBeenCalledTimes(1);
  });

  it('records the error and returns null when the download fails', async () => {
    vi.spyOn(voskBrowser, 'createModel').mockRejectedValue(new Error('network down'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useVoskModelContext(), { wrapper });

    await act(async () => {
      const loaded = await result.current.load();
      expect(loaded).toBeNull();
    });

    await waitFor(() => expect(result.current.error).toBe('network down'));
    expect(result.current.isReady).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });

  it('allows a retry after a failed download', async () => {
    const createModel = vi
      .spyOn(voskBrowser, 'createModel')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(createMockModel());
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useVoskModelContext(), { wrapper });

    await act(async () => {
      await result.current.load();
    });

    await act(async () => {
      await result.current.load();
    });

    expect(createModel).toHaveBeenCalledTimes(2);
    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeNull();
  });
});