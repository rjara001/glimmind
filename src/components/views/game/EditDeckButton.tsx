interface EditDeckButtonProps {
  onClick: () => void;
}

export function EditDeckButton({ onClick }: EditDeckButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 left-3 z-40 flex items-center justify-center w-9 h-9 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 shadow-sm transition-all"
      aria-label="Edit deck"
      title="Edit deck"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>
    </button>
  );
}