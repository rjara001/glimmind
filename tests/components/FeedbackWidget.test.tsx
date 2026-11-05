import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { FeedbackWidget } from '../../src/components/FeedbackWidget';
import { useAuth } from '../../src/context/AuthContext';
import { GUEST_UID } from '../../src/constants/app';
import type { MyfeedinWindow } from '../../src/types/feedback-widget';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('FeedbackWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    delete (window as MyfeedinWindow).__MyfeedinInitialized;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as MyfeedinWindow).__MyfeedinInitialized;
  });

  it('does not inject script while auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      error: null,
      logout: vi.fn(),
      clearError: vi.fn(),
      setUser: vi.fn(),
    } as any);

    render(<FeedbackWidget />);

    const script = document.getElementById('glimmind-feedback-widget');
    expect(script).toBeNull();
  });

  it('injects script with data-tenant and data-project for anonymous/guest users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: GUEST_UID } as any,
      loading: false,
      error: null,
      logout: vi.fn(),
      clearError: vi.fn(),
      setUser: vi.fn(),
    } as any);

    render(<FeedbackWidget />);

    const script = document.getElementById('glimmind-feedback-widget') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.src).toBe('https://myfeedin.com/widget.js');
    expect(script.getAttribute('data-tenant')).toBe('tenant_randus');
    expect(script.getAttribute('data-project')).toBe('Tr3zskqgT2MchZXwwkP9');
    expect(script.getAttribute('data-position')).toBe('bottom-left');
    expect(script.getAttribute('data-color')).toBe('#2563eb');
    expect(script.hasAttribute('data-user-email')).toBe(false);
  });

  it('injects script with data-user-email when user is authenticated with email', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'real-user-123', email: 'test@example.com' } as any,
      loading: false,
      error: null,
      logout: vi.fn(),
      clearError: vi.fn(),
      setUser: vi.fn(),
    } as any);

    render(<FeedbackWidget />);

    const script = document.getElementById('glimmind-feedback-widget') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.getAttribute('data-tenant')).toBe('tenant_randus');
    expect(script.getAttribute('data-project')).toBe('Tr3zskqgT2MchZXwwkP9');
    expect(script.getAttribute('data-user-email')).toBe('test@example.com');
  });

  it('cleans up script and residual widget nodes on unmount', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
      logout: vi.fn(),
      clearError: vi.fn(),
      setUser: vi.fn(),
    } as any);

    const { unmount } = render(<FeedbackWidget />);

    // Simulate widget adding its DOM nodes
    const widgetNode = document.createElement('div');
    widgetNode.id = 'myfeedin-widget';
    document.body.appendChild(widgetNode);

    const modalNode = document.createElement('div');
    modalNode.id = 'myfeedin-modal';
    document.body.appendChild(modalNode);

    expect(document.getElementById('glimmind-feedback-widget')).not.toBeNull();
    expect(document.getElementById('myfeedin-widget')).not.toBeNull();
    expect(document.getElementById('myfeedin-modal')).not.toBeNull();

    unmount();

    expect(document.getElementById('glimmind-feedback-widget')).toBeNull();
    expect(document.getElementById('myfeedin-widget')).toBeNull();
    expect(document.getElementById('myfeedin-modal')).toBeNull();
  });
});
