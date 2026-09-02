import { useMediaQuery } from './useMediaQuery';

export interface OrientationState {
  isPortrait: boolean;
  isLandscape: boolean;
  isMobile: boolean;
}

export function useOrientation(): OrientationState {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isMobile = useMediaQuery('(max-width: 1023px)');
  return { isPortrait, isLandscape, isMobile };
}