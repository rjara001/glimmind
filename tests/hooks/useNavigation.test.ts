import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigation } from '../../src/hooks/app/useNavigation';

const mockRouterNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockRouterNavigate,
}));

describe('useNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not push a duplicate history entry when navigating to the current view', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigate('game');
    });
    // Bootstrap auto-nav and handlePlayList both fire navigate('game') on the
    // first play of a session; the second call must be a no-op for history.
    act(() => {
      result.current.navigate('game');
    });

    expect(result.current.view).toBe('game');
    expect(mockRouterNavigate).toHaveBeenLastCalledWith('/game');

    act(() => {
      result.current.goBack();
    });

    expect(result.current.view).toBe('dashboard');
    expect(mockRouterNavigate).toHaveBeenLastCalledWith('/dashboard');
  });

  it('goBack falls back to the dashboard when the history is empty', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.goBack();
    });

    expect(result.current.view).toBe('dashboard');
    expect(mockRouterNavigate).toHaveBeenLastCalledWith('/dashboard');
  });

  it('navigating to dashboard clears the history stack', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.navigate('game');
    });
    act(() => {
      result.current.navigate('dashboard');
    });
    act(() => {
      result.current.navigate('game');
    });
    act(() => {
      result.current.goBack();
    });

    expect(result.current.view).toBe('dashboard');
  });
});
