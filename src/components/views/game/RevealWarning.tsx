import type { RefObject } from "react";

interface RevealWarningProps {
  onTry: () => void;
  onReveal: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function RevealWarning({ onTry, onReveal, inputRef }: RevealWarningProps) {
  return (
    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3">
      <p className="text-xs font-bold text-amber-800">You haven&apos;t made any attempts.</p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            onTry();
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition"
        >
          Try
        </button>
        <button
          onClick={onReveal}
          className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-50 transition"
        >
          Reveal
        </button>
      </div>
    </div>
  );
}