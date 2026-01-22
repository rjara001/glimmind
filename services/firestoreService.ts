
import { db, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, isConfigured } from '../firebase';
import { AssociationList } from '../types';

const COLLECTION_NAME = "lists";

export const listService = {
  /**
   * Se suscribe a las listas del usuario. 
   * Si es invitado, lee de localStorage. Si está autenticado, usa Firestore.
   */
  subscribeToLists: (userId: string, onUpdate: (lists: AssociationList[]) => void) => {
    // Caso: Usuario Invitado
    if (userId.startsWith('guest-')) {
      const loadLocal = () => {
        const saved = localStorage.getItem(`glimmind_lists_${userId}`);
        onUpdate(saved ? JSON.parse(saved) : []);
      };
      
      loadLocal();
      // Escuchar cambios locales (opcional para consistencia entre pestañas)
      window.addEventListener('storage', loadLocal);
      return () => window.removeEventListener('storage', loadLocal);
    }

    // Caso: Usuario Firebase
    if (isConfigured && db) {
      const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
      return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(d => ({ 
          ...d.data(), 
          id: d.id // Aseguramos que el ID del documento sea el ID de la lista
        } as AssociationList));
        onUpdate(lists);
      }, (error) => {
        console.error("Error en suscripción Firestore:", error);
      });
    }

    return () => {};
  },

  /**
   * Guarda o actualiza una lista.
   */
  saveList: async (userId: string, list: AssociationList) => {
    if (userId.startsWith('guest-')) {
      const saved = localStorage.getItem(`glimmind_lists_${userId}`);
      let lists: AssociationList[] = saved ? JSON.parse(saved) : [];
      const index = lists.findIndex(l => l.id === list.id);
      
      if (index >= 0) lists[index] = list;
      else lists.push(list);
      
      localStorage.setItem(`glimmind_lists_${userId}`, JSON.stringify(lists));
      return;
    }

    if (isConfigured && db) {
      const listRef = doc(db, COLLECTION_NAME, list.id);
      await setDoc(listRef, {
        ...list,
        userId, // Forzamos el userId para seguridad
        updatedAt: Date.now()
      }, { merge: true });
    } else {
      throw new Error("Firestore no configurado");
    }
  },

  /**
   * Elimina una lista permanentemente.
   */
  deleteList: async (userId: string, listId: string) => {
    if (userId.startsWith('guest-')) {
      const saved = localStorage.getItem(`glimmind_lists_${userId}`);
      if (saved) {
        let lists: AssociationList[] = JSON.parse(saved);
        lists = lists.filter(l => l.id !== listId);
        localStorage.setItem(`glimmind_lists_${userId}`, JSON.stringify(lists));
      }
      return;
    }

    if (isConfigured && db) {
      await deleteDoc(doc(db, COLLECTION_NAME, listId));
    }
  }
};
