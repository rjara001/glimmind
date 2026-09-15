import React from "react";
import { BulkImport } from "./BulkImport";

interface ListEditorBulkImportProps {
  onBulkAdd: (text: string) => void;
}

export const ListEditorBulkImport: React.FC<ListEditorBulkImportProps> = ({
  onBulkAdd,
}) => {
  return <BulkImport onBulkAdd={onBulkAdd} />;
};