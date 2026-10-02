import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { GUEST_UID } from '../constants/app';

// En desarrollo el widget se sirve desde el dev server de feedbacker, que hace
// de proxy hacia el emulador de Cloud Functions. En produccion, desde Firebase Hosting.
const WIDGET_SRC = import.meta.env.DEV
  ? 'http://localhost:3001/widget.js'
  : 'https://ema-test-226120.web.app/widget.js';
const PROJECT_ID = 'eWw0vE9ztIKc3A3lrEKE';
const SCRIPT_ID = 'glimmind-feedback-widget';

/**
 * Carga el widget de feedback de myfeedin.com.
 *
 * El widget se inyecta siempre (visitantesanonimosincluded), pero el atributo
 * `data-user-email` solo se envia cuando hay una sesion real de Firebase: en ese
 * caso el widget oculta el campo de email y lo rellena por el, de modo que nunca
 * se pide el correo a un usuario que ya esta identificado.
 *
 * El usuario invitado (GUEST_UID) es local y no tiene email, asi que cae en el
 * caso anonimo: el widget le pregunta el correo.
 */
export const FeedbackWidget: React.FC = () => {
  const { user, loading } = useAuth();
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Esperamos a que Firebase resuelva la sesion para no inyectar el script con
    // el email equivocado (o sin email) y tener que recargarlo.
    if (loading) return;

    const hasRealUser = Boolean(user && user.uid !== GUEST_UID && user.email);
    const email = hasRealUser ? (user!.email as string).trim() : '';

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = WIDGET_SRC;
    script.async = true;
    script.setAttribute('data-project', PROJECT_ID);
    if (email) {
      script.setAttribute('data-user-email', email);
    }
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      // El widget deja nodos en el DOM; se limpian al recargar/reinyectar.
      document.getElementById('feedbacker-widget')?.remove();
      document.getElementById('feedbacker-modal')?.remove();
    };
  }, [user?.uid, user?.email, loading]);

  return null;
};