import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';
import React from 'react';

const TestComponentWithToast = () => {
  const { showToast } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast('Test message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Info message', 'info')}>Show Info</button>
    </div>
  );
};

describe('Toast Notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should render ToastProvider without errors', () => {
    render(
      <ToastProvider>
        <div>Test</div>
      </ToastProvider>
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should show success toast', async () => {
    render(
      <ToastProvider>
        <TestComponentWithToast />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show success/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should show error toast', async () => {
    render(
      <ToastProvider>
        <TestComponentWithToast />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show error/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('should show info toast', async () => {
    render(
      <ToastProvider>
        <TestComponentWithToast />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show info/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('should auto-remove toast after timeout', async () => {
    render(
      <ToastProvider>
        <TestComponentWithToast />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show success/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });
  });

  it('should allow manual removal of toast', async () => {
    render(
      <ToastProvider>
        <TestComponentWithToast />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show success/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button');
    closeButton.click();

    await waitFor(() => {
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });
  });

  it('should render multiple toasts', async () => {
    render(
      <ToastProvider>
        <TestComponentWithToast />
      </ToastProvider>
    );

    const successButton = screen.getByRole('button', { name: /show success/i });
    const errorButton = screen.getByRole('button', { name: /show error/i });
    
    successButton.click();
    errorButton.click();

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('should render toasts in fixed position', () => {
    render(
      <ToastProvider>
        <button>Test</button>
      </ToastProvider>
    );

    const toastContainer = document.body.querySelector('.fixed.bottom-6');
    expect(toastContainer).toBeInTheDocument();
  });

  it('should have correct z-index for toasts', () => {
    render(
      <ToastProvider>
        <button>Test</button>
      </ToastProvider>
    );

    const toastContainer = document.body.querySelector('.z-50');
    expect(toastContainer).toBeInTheDocument();
  });

  it('should throw error when useToast used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponentWithToast />);
    }).toThrow('useToast must be used within ToastProvider');
    
    consoleError.mockRestore();
  });
});
