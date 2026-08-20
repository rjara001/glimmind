export interface SettingsModalProps {
  list: import('../types').AssociationList;
  onUpdateList: (list: import('../types').AssociationList) => void;
  onClose: () => void;
}
