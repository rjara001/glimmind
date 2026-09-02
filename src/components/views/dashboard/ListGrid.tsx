import type { AssociationList } from "../../../types";
import { ListCard } from "./ListCard";

interface ListGridProps {
  lists: AssociationList[];
  onPlay: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ListGrid({ lists, onPlay, onEdit, onDelete }: ListGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {lists.map((list) => (
        <ListCard
          key={list.id}
          list={list}
          onPlay={onPlay}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}