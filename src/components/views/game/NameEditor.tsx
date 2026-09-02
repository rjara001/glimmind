import type { NameEditorProps } from "../../../types/game-view";

export function NameEditor({ value, onChange, onSave, onCancel, inputRef }: NameEditorProps) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-xl border border-indigo-200 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onSave}
        className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none w-[140px] truncate"
        maxLength={50}
      />
      <button onClick={onSave} className="p-1 text-indigo-600 hover:text-indigo-700">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}