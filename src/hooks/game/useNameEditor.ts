import { useCallback, useRef, useState } from "react";
import type { AssociationList } from "../../types";

export interface UseNameEditorArgs {
  list: AssociationList;
  onUpdateList?: (list: AssociationList) => Promise<void>;
}

export interface NameEditor {
  isEditing: boolean;
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  start: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  onChange: (value: string) => void;
}

export function useNameEditor({ list, onUpdateList }: UseNameEditorArgs): NameEditor {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const start = useCallback(() => {
    setValue(list.name);
    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [list.name]);

  const cancel = useCallback(() => {
    setIsEditing(false);
    setValue("");
  }, []);

  const save = useCallback(async () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== list.name && onUpdateList) {
      await onUpdateList({ ...list, name: trimmed });
    }
    setIsEditing(false);
  }, [value, list, onUpdateList]);

  return {
    isEditing,
    value,
    inputRef,
    start,
    cancel,
    save,
    onChange: setValue,
  };
}