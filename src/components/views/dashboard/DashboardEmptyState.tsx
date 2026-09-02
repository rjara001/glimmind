interface DashboardEmptyStateProps {
  hasSearchTerm: boolean;
  onClearSearch: () => void;
}

export function DashboardEmptyState({ hasSearchTerm, onClearSearch }: DashboardEmptyStateProps) {
  if (hasSearchTerm) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">No se encontraron resultados</h3>
        <p className="text-gray-500 mt-1">Prueba con términos diferentes.</p>
        <button
          onClick={onClearSearch}
          className="mt-4 text-indigo-600 font-bold hover:underline"
        >
          Ver todas las listas
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900">No hay listas aún</h3>
      <p className="text-gray-500 mt-2">Crea tu primera lista para empezar a estudiar.</p>
    </div>
  );
}