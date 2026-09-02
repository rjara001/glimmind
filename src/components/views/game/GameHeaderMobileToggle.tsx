import type { GameHeaderMobileToggleProps } from "../../../types/game-view";
import { NameEditor } from "./NameEditor";

export function GameHeaderMobileToggle({
  list,
  isVoiceActive,
  immersive,
  isEditingName,
  onStartEdit,
  onToggleVoice,
  nameEditor,
}: GameHeaderMobileToggleProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-2 px-1">
      {isEditingName && nameEditor ? (
        <NameEditor {...nameEditor} />
      ) : (
        <button
          onClick={(e) => {
            if (e.detail === 2) {
              onStartEdit();
            } else {
              immersive.toggle();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-bold text-slate-500 truncate max-w-[180px]">{list.name}</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${immersive.isVisible ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
      <button
        onClick={onToggleVoice}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
          isVoiceActive
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-white text-slate-500 border border-slate-100"
        }`}
        aria-label={isVoiceActive ? "Disable voice" : "Enable voice"}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {isVoiceActive ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          )}
        </svg>
        <span className="hidden sm:inline">{isVoiceActive ? "Voice ON" : "Voice"}</span>
      </button>
    </div>
  );
}