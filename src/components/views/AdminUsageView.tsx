import React, { useState, useEffect, useCallback } from 'react';
import { adminService, AdminUsageReport, ServiceUsage } from '../../services/adminService';

interface AdminUsageViewProps {
  onBack: () => void;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function UsageBar({ label, usage, unit }: { label: string; usage: ServiceUsage; unit?: string }) {
  const percentage = usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const state = percentage >= 100 ? 'blocked' : percentage >= 70 ? 'warning' : 'ok';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-slate-600 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            state === 'blocked' ? 'bg-rose-500' : state === 'warning' ? 'bg-amber-500' : 'bg-indigo-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-slate-500 w-40 text-right shrink-0">
        {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} {unit || ''}
        {usage.calls > 0 && <span className="text-slate-400 ml-1">({usage.calls} calls)</span>}
      </span>
    </div>
  );
}

export const AdminUsageView: React.FC<AdminUsageViewProps> = ({ onBack }) => {
  const [month, setMonth] = useState(currentMonthKey);
  const [report, setReport] = useState<AdminUsageReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getUsage(month);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading usage data');
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(e.target.value);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-white rounded-full"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Admin Usage Dashboard</h2>
          <p className="text-sm text-gray-500">Consumo de servicios por usuario y global.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Mes:</label>
          <input
            type="month"
            value={month}
            onChange={handleMonthChange}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                <div className="h-3 bg-slate-50 rounded w-full" />
                <div className="h-3 bg-slate-50 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!isLoading && !error && report && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">Global Usage</h3>
            <div className="space-y-3">
              <UsageBar label="Translation" usage={report.translation.global} unit="chars" />
              <UsageBar label="TTS" usage={report.tts.global} unit="chars" />
              <UsageBar label="STT" usage={report.stt.global} unit="secs" />
              <UsageBar label="AI" usage={report.ai.global} unit="calls" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Per-User Usage</h3>
            {report.users.length === 0 && (
              <p className="text-sm text-slate-400 italic">No hay usuarios con uso este mes.</p>
            )}
            {report.users.map((user) => (
              <div key={user.uid} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{user.email}</span>
                    <span className={`ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      user.tier === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {user.tier}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <UsageBar label="Translation" usage={user.translation} unit="chars" />
                  <UsageBar label="TTS" usage={user.tts} unit="chars" />
                  <UsageBar label="STT" usage={user.stt} unit="secs" />
                  <UsageBar label="AI" usage={user.ai} unit="calls" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
