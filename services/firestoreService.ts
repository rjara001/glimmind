
import { db, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, isConfigured } from '../firebase';
import { AssociationList } from '../types';

const COLLECTION_NAME = "lists";
const GUEST_PREFIX = "guest-user-";

export const listService = {
  /**
   * Suscribirse a las listas del usuario (Cloud o Local)
   */
  subscribeToLists: (userId: string, onUpdate: (lists: AssociationList[]) => void) => {
    if (userId.startsWith(GUEST_PREFIX)) {
      const loadLocal = () => {
        const saved = localStorage.getItem(`glimmind_lists_${userId}`);
        onUpdate(saved ? JSON.parse(saved) : []);
      };
      loadLocal();
      window.addEventListener('storage', loadLocal);
      return () => window.removeEventListener('storage', loadLocal);
    }

    if (isConfigured && db) {
      const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
      return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(d => ({ ...d.data() } as AssociationList));
        onUpdate(lists);
      });
    }
    return () => {};
  },

  /**
   * Guarda una lista en el backend correspondiente
   */
  saveList: async (userId: string, list: AssociationList) => {
    if (userId.startsWith(GUEST_PREFIX)) {
      const storageKey = `glimmind_lists_${userId}`;
      const saved = localStorage.getItem(storageKey);
      let lists: AssociationList[] = saved ? JSON.parse(saved) : [];
      const index = lists.findIndex(l => l.id === list.id);
      
      if (index >= 0) lists[index] = list;
      else lists.push(list);
      
      localStorage.setItem(storageKey, JSON.stringify(lists));
      return;
    }

    if (isConfigured && db) {
      await setDoc(doc(db, COLLECTION_NAME, list.id), {
        ...list,
        userId,
        updatedAt: Date.now()
      }, { merge: true });
    }
  },

  /**
   * Migra datos locales de un invitado a la cuenta de un usuario recién autenticado
   */
  migrateGuestData: async (guestId: string, userId: string) => {
    const storageKey = `glimmind_lists_${guestId}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    const localLists: AssociationList[] = JSON.parse(saved);
    if (localLists.length === 0) return;

    console.log(`🚀 Migrando ${localLists.length} listas a la nube...`);
    
    for (const list of localLists) {
      await listService.saveList(userId, {
        ...list,
        userId // Reasignar al nuevo ID de usuario real
      });
    }

    // Limpiar localstorage después de migrar con éxito
    localStorage.removeItem(storageKey);
    localStorage.removeItem('glimmind_guest_user');
  },

  deleteList: async (userId: string, listId: string) => {
    if (userId.startsWith(GUEST_PREFIX)) {
      const storageKey = `glimmind_lists_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        let lists: AssociationList[] = JSON.parse(saved);
        lists = lists.filter(l => l.id !== listId);
        localStorage.setItem(storageKey, JSON.stringify(lists));
      }
      return;
    }

    if (isConfigured && db) {
      await deleteDoc(doc(db, COLLECTION_NAME, listId));
    }
  }
};
