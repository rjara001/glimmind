import { FlowTracker } from '../utils/breadcrumbs';

export interface SettingsModalProps {
  list: import('../types').AssociationList;
  onUpdateList: (list: import('../types').AssociationList, tracker?: FlowTracker) => void | Promise<void>;
  onClose: () => void;
}
