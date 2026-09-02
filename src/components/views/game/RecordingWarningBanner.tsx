export function RecordingWarningBanner() {
  return (
    <div className="w-full max-w-2xl mb-3 px-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-amber-600 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <p className="text-[10px] font-bold text-amber-800 leading-tight">
          Grabación temporal activa: los audios se suben a la nube y se eliminan automáticamente.
        </p>
      </div>
    </div>
  );
}