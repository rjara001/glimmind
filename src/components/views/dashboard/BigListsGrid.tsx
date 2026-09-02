import type { AssociationList } from "../../../types";
import { computeStateBreakdown } from "../../../utils/progress";
import { BigListCard } from "../../cards/BigListCard";
interface BigListsGridProps {
  lists: AssociationList[];
  milestones: Record<string, number[]>;
  onPlay: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function BigListsGrid({
  lists,
  milestones,
  onPlay,
  onEdit,
  onDelete,
}: BigListsGridProps) {
  if (lists.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Listas en digestión</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lists.map((list) => {
          const active = (list.associations || []).filter((a) => !a.isArchived);
          const breakdown = computeStateBreakdown(active);
          return (
            <BigListCard
              key={list.id}
              list={list}
              breakdown={breakdown}
              milestones={milestones[list.id] || []}
              onPlay={onPlay}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}