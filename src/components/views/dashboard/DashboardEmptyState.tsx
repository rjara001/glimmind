interface DashboardEmptyStateProps {
  hasSearchTerm: boolean;
  onClearSearch: () => void;
}

import { useTranslation } from "react-i18next";

export function DashboardEmptyState({ hasSearchTerm, onClearSearch }: DashboardEmptyStateProps) {
  const { t } = useTranslation(["common", "dashboard"]);

  if (hasSearchTerm) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">{t("no_se_encontraron_resultados", "No se encontraron resultados")}</h3>
        <p className="text-gray-500 mt-1">{t("prueba_con_terminos_diferentes", "Prueba con términos diferentes.")}</p>
        <button
          onClick={onClearSearch}
          className="mt-4 text-indigo-600 font-bold hover:underline"
        >
          {t("ver_todas_las_listas", "Ver todas las listas")}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900">{t("no_hay_listas_aun", "No hay listas aún")}</h3>
      <p className="text-gray-500 mt-2">{t("crea_tu_primera_lista_para_empezar_a_estud", "Crea tu primera lista para empezar a estudiar.")}</p>
    </div>
  );
}