import React from 'react';
import type { VoiceCommandId } from '../../../types';
import { DEFAULT_VOICE_COMMANDS } from '../../../services/voice/stt/commands';

interface VoiceCommandsSectionProps {
  draft: Record<string, unknown>;
  onDraftChange: (draft: Record<string, unknown>) => void;
}

export const VoiceCommandsSection: React.FC<VoiceCommandsSectionProps> = ({
  draft,
  onDraftChange,
}) => {
  const getCommandValue = (id: VoiceCommandId): string => {
    const raw = (draft.voiceCommands as Record<string, string[]>)?.[id];
    if (raw === undefined) {
      return DEFAULT_VOICE_COMMANDS[id].join(', ');
    }
    return raw.join(', ');
  };

  const setCommandValue = (id: VoiceCommandId, value: string) => {
    const keywords = value
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    const currentCommands = (draft.voiceCommands as Record<string, string[]>) || {};
    onDraftChange({
      ...draft,
      voiceCommands: {
        ...currentCommands,
        [id]: keywords,
      },
    });
  };

  return (
    <div className="pt-3 border-t border-slate-200">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
        Voice commands
      </p>
      <p className="text-[10px] text-slate-400 mb-3">
        Comma-separated keywords, recognized in the answer language.
      </p>
      {(
        Object.keys(
          DEFAULT_VOICE_COMMANDS
        ) as VoiceCommandId[]
      ).map((id) => (
        <div key={id} className="mb-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {id}
          </label>
          <input
            type="text"
            value={getCommandValue(id)}
            onChange={(e) => setCommandValue(id, e.target.value)}
            className="w-full bg-white border-2 border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
            aria-label={`Voice command ${id}`}
          />
        </div>
      ))}
    </div>
  );
};
