import React from "react";
import { BulkImport } from "./BulkImport";

interface ListEditorBulkImportProps {
  onBulkAdd: (text: string) => void;
  onFileName?: (name: string) => void;
}

export const ListEditorBulkImport: React.FC<ListEditorBulkImportProps> = ({
  onBulkAdd,
  onFileName,
}) => {
  return <BulkImport onBulkAdd={onBulkAdd} onFileName={onFileName} />;
};