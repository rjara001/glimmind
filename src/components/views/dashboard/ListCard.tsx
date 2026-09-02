import type { AssociationList } from "../../../types";

interface ListCardProps {
  list: AssociationList;
  onPlay: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ListCard({ list, onPlay, onEdit, onDelete }: ListCardProps) {
  const allAssociations = list.associations || [];
  const activeAssociations = allAssociations.filter((a) => !a.isArchived);
  const archivedCount = allAssociations.filter((a) => a.isArchived).length;
  const totalCount = allAssociations.length;
  const canPlay = activeAssociations.length > 0;
  const achievementPercent =
    totalCount > 0 ? Math.round((archivedCount / totalCount) * 100) : 0;
  const isComplete = achievementPercent === 100;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
      <div className="flex justify-between items-start mb-4">
        <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
          {list.concept}
        </span>
        <button
          onClick={() => onDelete(list.id)}
          className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">{list.name}</h3>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-gray-500 text-sm">{activeAssociations.length} pairs</p>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`text-sm font-bold ${isComplete ? "text-emerald-600" : "text-slate-600"}`}
        >
          {archivedCount} / {totalCount}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${isComplete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
        >
          logro {achievementPercent}%
        </span>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onPlay(list.id)}
          disabled={!canPlay}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          Study
        </button>
        <button
          onClick={() => onEdit(list.id)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          Edit
        </button>
      </div>
    </div>
  );
}