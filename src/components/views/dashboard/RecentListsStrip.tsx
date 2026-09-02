import type { AssociationList } from "../../../types";

interface RecentListsStripProps {
  lists: AssociationList[];
  onPlay: (id: string) => void;
}

export function RecentListsStrip({ lists, onPlay }: RecentListsStripProps) {
  if (lists.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Listas Recientes</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {lists.map((list) => {
          const allAssociations = list.associations || [];
          const archivedCount = allAssociations.filter((a) => a.isArchived).length;
          const totalCount = allAssociations.length;
          const achievementPercent =
            totalCount > 0 ? Math.round((archivedCount / totalCount) * 100) : 0;
          const isComplete = achievementPercent === 100;
          return (
            <button
              key={list.id}
              onClick={() => onPlay(list.id)}
              className="flex-shrink-0 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition text-left min-w-[200px]"
            >
              <p className="font-bold text-gray-900 truncate">{list.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-sm font-bold ${isComplete ? "text-emerald-600" : "text-slate-600"}`}
                >
                  {archivedCount} / {totalCount}
                </span>
                <span
                  className={`text-xs font-medium ${isComplete ? "text-emerald-600" : "text-slate-500"}`}
                >
                  logro {achievementPercent}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}