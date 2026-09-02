interface DashboardToolbarProps {
  onOpenYouTube: () => void;
  onOpenDeckStore: () => void;
  onCreateEmpty: () => void;
  createDisabled: boolean;
  createTitle?: string;
}

export function DashboardToolbar({
  onOpenYouTube,
  onOpenDeckStore,
  onCreateEmpty,
  createDisabled,
  createTitle,
}: DashboardToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Tus Listas de Estudio</h2>
        <p className="text-gray-500 mt-1">Memoriza asociaciones de palabras rápidamente.</p>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <button
          onClick={onOpenYouTube}
          className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-100 transition shadow-sm flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Desde YouTube
        </button>
        <button
          onClick={onOpenDeckStore}
          className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-100 transition shadow-sm flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l-.4-2M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.708.447 1.953.134.058.277.088.422.088h11M17 13l2.293 2.293c.63.63.184 1.708-.447 1.953-.134.058-.277.088-.422.088h-11M7 13V6a1 1 0 00-1-1H4a1 1 0 000 2h2v7z" />
          </svg>
          Catálogo de Barajas
        </button>
        <button
          onClick={onCreateEmpty}
          disabled={createDisabled}
          title={createTitle}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2 w-full md:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Lista
        </button>
      </div>
    </div>
  );
}