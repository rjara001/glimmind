export type LoadPhase = 'idle' | 'loading' | 'loaded' | 'error';

export type BootstrapPart = 'lists' | 'quota' | 'settings' | 'sync';

export interface BootstrapStatus {
  lists: LoadPhase;
  quota: LoadPhase;
  settings: LoadPhase;
  sync: LoadPhase;
  listsSyncAt: number | null;
  error: string | null;
}

export function createInitialBootstrapStatus(): BootstrapStatus {
  return {
    lists: 'idle',
    quota: 'idle',
    settings: 'idle',
    sync: 'idle',
    listsSyncAt: null,
    error: null,
  };
}
