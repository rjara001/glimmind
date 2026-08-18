import { useRef, useEffect } from 'react';
import { AssociationList } from '../../types';
import { GlimmindGame } from '../../services/gameEngine';
import { useGameStore } from '../../store/gameStore';

export interface VoiceGameRefs {
  gameRef: ReturnType<typeof useRef<GlimmindGame>>;
  sessionIdRef: ReturnType<typeof useRef<string>>;
  shouldRunRef: ReturnType<typeof useRef<boolean>>;
  phaseRef: ReturnType<typeof useRef<string>>;
  resultTimerRef: ReturnType<typeof useRef<ReturnType<typeof setTimeout> | null>>;
  answerHandledRef: ReturnType<typeof useRef<boolean>>;
  listeningFailedRef: ReturnType<typeof useRef<boolean>>;
  transcriptRef: ReturnType<typeof useRef<string>>;
}

export function useVoiceGameRefs(list: AssociationList): VoiceGameRefs {
  const trackingEnabled = useGameStore.getState().settings.activityHistoryEnabled;

  const gameRef = useRef(GlimmindGame.create(list, { trackingEnabled }));
  const sessionIdRef = useRef(crypto.randomUUID());
  const shouldRunRef = useRef(false);
  const phaseRef = useRef<string>('idle');
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerHandledRef = useRef(false);
  const listeningFailedRef = useRef(false);
  const transcriptRef = useRef('');

  useEffect(() => {
    gameRef.current = gameRef.current.updateList(list);
  }, [list]);

  useEffect(() => {
    transcriptRef.current = transcriptRef.current;
  }, []);

  return {
    gameRef,
    sessionIdRef,
    shouldRunRef,
    phaseRef,
    resultTimerRef,
    answerHandledRef,
    listeningFailedRef,
    transcriptRef,
  };
}
