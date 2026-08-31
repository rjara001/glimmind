import React, { useMemo } from 'react';
import type { DictionaryLink, DictionarySourceKey } from '../../types/dictionary-link';

const CAMBRIDGE_URL = 'https://dictionary.cambridge.org/dictionary/english-spanish/{term}';
const WORDREFERENCE_URL = 'https://www.wordreference.com/es/translation.asp?tranword={term}';
const URBAN_DICTIONARY_URL = 'https://www.urbandictionary.com/define.php?term={term}';
const YOUGLISH_URL = 'https://youglish.com/pronounce/{term}/english';

const SOURCE_META: Record<DictionarySourceKey, { label: string; icon: string; template: string }> = {
  cambridge: { label: 'Cambridge', icon: '📖', template: CAMBRIDGE_URL },
  wordreference: { label: 'WordReference', icon: '📚', template: WORDREFERENCE_URL },
  urbandictionary: { label: 'Urban Dictionary', icon: '🗣️', template: URBAN_DICTIONARY_URL },
  youglish: { label: 'YouGlish', icon: '🎬', template: YOUGLISH_URL },
};

function buildUrl(template: string, term: string): string {
  return template.replace('{term}', encodeURIComponent(term));
}

export function buildDictionaryLinks(term: string): DictionaryLink[] {
  const encodedTerm = term.trim();
  return (Object.keys(SOURCE_META) as DictionarySourceKey[]).map((key) => {
    const meta = SOURCE_META[key];
    return {
      key,
      label: meta.label,
      icon: meta.icon,
      href: buildUrl(meta.template, encodedTerm),
    };
  });
}

interface DictionaryShortcutsProps {
  term: string;
}

export const DictionaryShortcuts: React.FC<DictionaryShortcutsProps> = ({ term }) => {
  const links = useMemo(() => buildDictionaryLinks(term), [term]);

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        🛡️ Revalidar significado (confianza)
      </label>
      <p className="text-xs text-slate-400 mb-3">
        Consulta estas fuentes para verificar o ajustar el valor.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => (
          <a
            key={link.key}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
          >
            <span aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
