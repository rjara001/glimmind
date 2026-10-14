import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { GUEST_UID } from '../constants/app';
import type { MyfeedinWindow } from '../types/feedback-widget';

const WIDGET_SRC = 'https://myfeedin.com/widget.js';
const PROJECT_ID = 'ApEKA21QHCbR1cbAFPpA';
const WIDGET_POSITION = 'bottom-left';
const WIDGET_COLOR = '#2563eb';
const SCRIPT_ID = 'glimmind-feedback-widget';
const WIDGET_NODE_ID = 'myfeedin-widget';
const MODAL_NODE_ID = 'myfeedin-modal';
const INIT_FLAG = '__MyfeedinInitialized';

/**
 * Loads the myfeedin.com feedback widget.
 *
 * The script is always injected (anonymous visitors included), but the
 * `data-user-email` attribute is only set when there is a real Firebase
 * session: in that case the widget hides the email field and fills it in,
 * so an already identified user is never asked for their email.
 *
 * The guest user (GUEST_UID) is local and has no email, so it falls into the
 * anonymous path and the widget asks for one.
 *
 * widget.js only initializes once per page load (guarded by
 * `window.__MyfeedinInitialized`), so the flag is cleared before every
 * injection; otherwise a re-injection after a sign-in/sign-out would keep the
 * previous session email.
 */
export const FeedbackWidget: React.FC = () => {
  const { user, loading } = useAuth();
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Wait for Firebase to resolve the session so the script is not injected
    // with the wrong email (or none) and has to be reloaded.
    if (loading) return;

    const email =
      user && user.uid !== GUEST_UID && user.email ? user.email.trim() : '';

    document.getElementById(SCRIPT_ID)?.remove();
    document.getElementById(WIDGET_NODE_ID)?.remove();
    document.getElementById(MODAL_NODE_ID)?.remove();
    delete (window as MyfeedinWindow)[INIT_FLAG];

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = WIDGET_SRC;
    script.async = true;
    script.setAttribute('data-project', PROJECT_ID);
    script.setAttribute('data-position', WIDGET_POSITION);
    script.setAttribute('data-color', WIDGET_COLOR);
    if (email) {
      script.setAttribute('data-user-email', email);
    }
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      scriptRef.current?.remove();
      scriptRef.current = null;
      // The widget leaves DOM nodes behind; they are cleaned on re-injection.
      document.getElementById(WIDGET_NODE_ID)?.remove();
      document.getElementById(MODAL_NODE_ID)?.remove();
    };
  }, [user?.uid, user?.email, loading]);

  return null;
};
