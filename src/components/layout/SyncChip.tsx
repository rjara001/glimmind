import type { LoadPhase } from '../../types/bootstrap-status';

interface SyncChipProps {
  label: string;
  loadingLabel: string;
  errorLabel: string;
  phase: LoadPhase;
  onRetry?: () => void;
}

export function SyncChip({ label, loadingLabel, errorLabel, phase, onRetry }: SyncChipProps) {
  if (phase === 'idle') return null;

  if (phase === 'loading') {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700"
      >
        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {loadingLabel}
      </span>
    );
  }

  if (phase === 'error') {
    return (
      <span
        role="alert"
        className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-700"
      >
        ⚠ {errorLabel}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="underline hover:no-underline font-semibold"
          >
            Reintentar
          </button>
        )}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
    >
      ✓ {label}
    </span>
  );
}
