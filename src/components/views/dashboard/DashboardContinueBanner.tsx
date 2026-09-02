import type { AssociationList } from "../../../types";

interface DashboardContinueBannerProps {
  currentList: AssociationList;
  lastPlayedId: string;
  onPlay: (id: string) => void;
}

export function DashboardContinueBanner({
  currentList,
  lastPlayedId,
  onPlay,
}: DashboardContinueBannerProps) {
  return (
    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-amber-700 font-medium">Continuar última sesión</p>
        <p className="text-lg font-bold text-gray-900">{currentList.name}</p>
      </div>
      <button
        onClick={() => onPlay(lastPlayedId)}
        className="bg-amber-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-600 transition"
      >
        Continuar
      </button>
    </div>
  );
}