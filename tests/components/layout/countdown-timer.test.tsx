import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from '@/components/layout/CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when it is not running', () => {
    render(<CountdownTimer seconds={5} isRunning={false} onComplete={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the initial value while running', () => {
    render(<CountdownTimer seconds={5} isRunning={true} onComplete={vi.fn()} />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('decreases one unit per second', () => {
    render(<CountdownTimer seconds={5} isRunning={true} onComplete={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('3')).toBeDefined();
  });

  it('calls onComplete exactly once when the countdown finishes', () => {
    const onComplete = vi.fn();
    render(<CountdownTimer seconds={2} isRunning={true} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('stops and resets when isRunning turns off before finishing', () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <CountdownTimer seconds={5} isRunning={true} onComplete={onComplete} />,
    );
    rerender(<CountdownTimer seconds={5} isRunning={false} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not call onComplete after unmount', () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <CountdownTimer seconds={2} isRunning={true} onComplete={onComplete} />,
    );
    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
