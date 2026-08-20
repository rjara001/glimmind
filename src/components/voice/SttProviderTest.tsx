/** DEBUG: STT Provider Test Harness
 *
 * Pantalla de pruebas QA para comparar motores de voz-a-texto.
 * NO forma parte del flujo de producción. Mantener oculta/comentada
 * hasta que se necesite validar empíricamente un proveedor STT.
 *
 * Proveedores cubiertos:
 * - Browser STT (Web Speech API)
 * - Google Chirp3 (Firebase) — streaming/batch
 * - Vosk (Offline / Grammar) — WASM local
 *
 * Uso:
 * 1. Importar el componente en una vista temporal o ruta de debug.
 * 2. Seleccionar proveedor, definir expectedWords, grabar.
 * 3. Exportar resultados a JSON/CSV para análisis externo.
 *
 * Ver entregable: useSttProviderSwitch + useVoskWordMatch
 */

import { useCallback, useMemo, useState } from 'react';
import { useSttProviderSwitch } from '../../hooks/voice/stt/useSttProviderSwitch';
import { SttProviderId, SttTestResult } from '../../types/stt';
import { STT_TEST_WORDS } from '../../hooks/voice/stt/sttTestWords';

interface SttProviderTestProps {
  onClose?: () => void;
}

interface ProviderOption {
  value: SttProviderId;
  label: string;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  { value: 'browser', label: 'Browser STT (Web Speech API)' },
  { value: 'google-streaming', label: 'Google Chirp3 (Firebase)' },
  { value: 'vosk', label: 'Vosk (Offline / Grammar)' },
];

export function SttProviderTest({ onClose }: SttProviderTestProps) {
  const [activeProvider, setActiveProvider] = useState<SttProviderId>('browser');
  const [expectedWords, setExpectedWords] = useState<string[]>(['hello']);
  const [selectedWord, setSelectedWord] = useState<string>('hello');

  const handleResult = useCallback((result: SttTestResult) => {
    console.log('[STT Test]', result);
  }, []);

  const { isListening, isReady, partial, start, stop, results } =
    useSttProviderSwitch({
      activeProvider,
      expectedWords,
      onResult: handleResult,
    });

  const handleStart = useCallback(() => {
    start();
  }, [start]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleWordSelect = useCallback(
    (word: string) => {
      setSelectedWord(word);
      setExpectedWords([word]);
    },
    [],
  );

  const handleCustomWord = useCallback(
    (value: string) => {
      const words = value
        .split(',')
        .map((w) => w.trim())
        .filter((w) => w.length > 0);
      setExpectedWords(words.length > 0 ? words : ['hello']);
      setSelectedWord(words[0] || 'hello');
    },
    [],
  );

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stt-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const exportCsv = useCallback(() => {
    const header = 'provider,expected,heard,matched,latencyMs,timestamp';
    const rows = results.map(
      (r) =>
        `${r.provider},${r.expected},${r.heard},${r.matched},${r.latencyMs},${r.timestamp}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stt-test-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const stats = useMemo(() => {
    const byProvider = new Map<SttProviderId, { total: number; matches: number; latencies: number[] }>();
    for (const r of results) {
      const entry = byProvider.get(r.provider) || { total: 0, matches: 0, latencies: [] };
      entry.total += 1;
      if (r.matched) entry.matches += 1;
      entry.latencies.push(r.latencyMs);
      byProvider.set(r.provider, entry);
    }
    const summary: Record<SttProviderId, { total: number; matches: number; accuracy: number; avgLatency: number }> = {} as Record<SttProviderId, { total: number; matches: number; accuracy: number; avgLatency: number }>;
    for (const [provider, entry] of byProvider) {
      summary[provider] = {
        total: entry.total,
        matches: entry.matches,
        accuracy: entry.total > 0 ? Math.round((entry.matches / entry.total) * 100) : 0,
        avgLatency: entry.latencies.length > 0 ? Math.round(entry.latencies.reduce((a, b) => a + b, 0) / entry.latencies.length) : 0,
      };
    }
    return summary;
  }, [results]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-slate-900">STT Provider Test Harness</h1>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Close
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Provider
            </label>
            <select
              value={activeProvider}
              onChange={(e) => setActiveProvider(e.target.value as SttProviderId)}
              className="w-full border-2 border-indigo-100 rounded-xl px-4 py-3 text-lg font-bold text-center"
            >
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Expected Word
            </label>
            <select
              value={selectedWord}
              onChange={(e) => handleWordSelect(e.target.value)}
              className="w-full border-2 border-indigo-100 rounded-xl px-4 py-3 text-lg font-bold text-center"
            >
              {STT_TEST_WORDS.map((item) => (
                <option key={item.word} value={item.word}>
                  {item.word} ({item.group})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Custom Expected Words (comma-separated)
          </label>
          <input
            type="text"
            value={expectedWords.join(', ')}
            onChange={(e) => handleCustomWord(e.target.value)}
            className="w-full border-2 border-indigo-100 rounded-xl px-4 py-3 text-lg font-bold text-center"
            placeholder="hello, world"
          />
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={isListening || !isReady}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-xs disabled:opacity-50"
            >
              {isListening ? 'Listening…' : 'Start'}
            </button>
            <button
              onClick={handleStop}
              disabled={!isListening}
              className="flex-1 bg-white text-slate-500 border border-slate-200 py-3 rounded-xl font-black uppercase text-xs disabled:opacity-50"
            >
              Stop
            </button>
          </div>
          <div className="text-center">
            {!isReady && (
              <p className="text-sm font-bold text-amber-600">
                {activeProvider === 'vosk' ? 'Loading Vosk model…' : 'Provider not supported in this browser'}
              </p>
            )}
          </div>
        </div>

        {partial && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
              Partial Transcript
            </p>
            <p className="text-lg font-medium text-indigo-700">"{partial}"</p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-slate-900">Results ({results.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={exportJson}
                disabled={results.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 rounded-xl disabled:opacity-50"
              >
                Export JSON
              </button>
              <button
                onClick={exportCsv}
                disabled={results.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 rounded-xl disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          {Object.keys(stats).length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {PROVIDER_OPTIONS.map((option) => {
                const stat = stats[option.value];
                if (!stat) return null;
                return (
                  <div key={option.value} className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {option.label}
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      Accuracy: {stat.accuracy}% ({stat.matches} / {stat.total})
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      Avg Latency: {stat.avgLatency}ms
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2 font-bold text-slate-500">Provider</th>
                  <th className="text-left px-4 py-2 font-bold text-slate-500">Expected</th>
                  <th className="text-left px-4 py-2 font-bold text-slate-500">Heard</th>
                  <th className="text-left px-4 py-2 font-bold text-slate-500">Matched</th>
                  <th className="text-right px-4 py-2 font-bold text-slate-500">Latency (ms)</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No results yet. Start listening and say the expected word.
                    </td>
                  </tr>
                ) : (
                  results.map((result, index) => (
                    <tr key={index} className="border-t border-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700">{result.provider}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{result.expected}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{result.heard || '(empty)'}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                            result.matched
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {result.matched ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-slate-700">
                        {result.latencyMs}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-bold text-amber-800">
            <strong>Note:</strong> Latency is measured from the start() call to the final result. For Vosk, model loading is lazy (first start() may be slower). Google provider uses Firebase Chirp3 (batch, not true streaming). Browser STT uses Web Speech API.
          </p>
        </div>
      </div>
    </div>
  );
}
