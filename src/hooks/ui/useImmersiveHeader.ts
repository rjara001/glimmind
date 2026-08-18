import { useState, useEffect, useCallback, useRef } from 'react';

const AUTO_HIDE_DELAY = 3000;
const SWIPE_THRESHOLD = 60;

export function useImmersiveHeader() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearAutoHide = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = undefined;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearAutoHide();
    autoHideTimer.current = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_HIDE_DELAY);
  }, [clearAutoHide]);

  const show = useCallback(() => {
    clearAutoHide();
    setIsVisible(true);
    scheduleAutoHide();
  }, [clearAutoHide, scheduleAutoHide]);

  const hide = useCallback(() => {
    clearAutoHide();
    setIsVisible(false);
  }, [clearAutoHide]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startY.current = touch.clientY;
    currentY.current = touch.clientY;
    setIsDragging(true);
    clearAutoHide();
  }, [clearAutoHide]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    currentY.current = touch.clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0) {
      setDragY(delta);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    const delta = currentY.current - startY.current;
    setIsDragging(false);
    setDragY(0);

    if (delta > SWIPE_THRESHOLD) {
      show();
    } else if (delta < -SWIPE_THRESHOLD && isVisible) {
      hide();
    } else if (delta > 0 && !isVisible) {
      show();
    }
  }, [isDragging, isVisible, show, hide]);

  useEffect(() => {
    return () => clearAutoHide();
  }, [clearAutoHide]);

  return {
    isVisible,
    isDragging,
    dragY,
    show,
    hide,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    scheduleAutoHide,
  };
}
