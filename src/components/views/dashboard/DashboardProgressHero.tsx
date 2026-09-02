import type { DashboardStats } from "../../../types/dashboard";

interface DashboardProgressHeroProps {
  stats: DashboardStats;
}

export function DashboardProgressHero({ stats }: DashboardProgressHeroProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Tu Progreso</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
          <p className="text-white/80 text-sm">Total Palabras</p>
          <p className="text-2xl font-bold text-white whitespace-nowrap">{stats.totalWords}</p>
        </div>
        <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
          <p className="text-white/80 text-sm">Aprendidas</p>
          <p className="text-2xl font-bold text-white whitespace-nowrap">{stats.totalLearned}</p>
        </div>
        <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
          <p className="text-white/80 text-sm">Por Aprender</p>
          <p className="text-2xl font-bold text-white whitespace-nowrap">{stats.remaining}</p>
        </div>
        <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
          <p className="text-white/80 text-sm">Completado</p>
          <p className="text-2xl font-bold text-white whitespace-nowrap">{stats.percentage}%</p>
        </div>
      </div>
      <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ width: `${stats.percentage}%` }}
        />
      </div>
    </div>
  );
}