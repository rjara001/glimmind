import { useState, useEffect, useCallback, useRef } from 'react';

const AUTO_HIDE_DELAY = 3000;

export function useImmersiveHeader() {
  const [isVisible, setIsVisible] = useState(false);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoHide = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearAutoHide();
    autoHideTimer.current = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_HIDE_DELAY);
  }, [clearAutoHide]);

  const toggle = useCallback(() => {
    setIsVisible((prev) => {
      const next = !prev;
      if (next) {
        scheduleAutoHide();
      } else {
        clearAutoHide();
      }
      return next;
    });
  }, [clearAutoHide, scheduleAutoHide]);

  const show = useCallback(() => {
    clearAutoHide();
    setIsVisible(true);
    scheduleAutoHide();
  }, [clearAutoHide, scheduleAutoHide]);

  const hide = useCallback(() => {
    clearAutoHide();
    setIsVisible(false);
  }, [clearAutoHide]);

  useEffect(() => {
    return () => clearAutoHide();
  }, [clearAutoHide]);

  return {
    isVisible,
    toggle,
    show,
    hide,
    scheduleAutoHide,
  };
}
