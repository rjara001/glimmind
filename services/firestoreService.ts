
import { db, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, isConfigured } from '../firebase';
import { AssociationList } from '../types';

const COLLECTION_NAME = "lists";
const GUEST_PREFIX = "guest-user-";
const DEV_PREFIX = "dev-user-";

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const listService = {
  subscribeToLists: (userId: string, onUpdate: (lists: AssociationList[]) => void) => {
    // Si NO estamos en local y es un invitado, usamos localStorage
    const isGuest = userId.startsWith(GUEST_PREFIX) || userId.startsWith(DEV_PREFIX);
    
    if (isGuest && !isLocalhost) {
      const loadLocal = () => {
        const saved = localStorage.getItem(`glimmind_lists_${userId}`);
        onUpdate(saved ? JSON.parse(saved) : []);
      };
      loadLocal();
      window.addEventListener('storage', loadLocal);
      return () => window.removeEventListener('storage', loadLocal);
    }

    if (isConfigured && db) {
      console.log(`📡 [Service] Suscribiéndose a Firestore para UID: ${userId} (${isLocalhost ? 'EMULADOR' : 'CLOUD'})`);
      const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
      return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(d => ({ ...d.data() } as AssociationList));
        console.log(`✅ [Service] Datos recibidos: ${lists.length} listas.`);
        onUpdate(lists);
      }, (err) => {
        console.error("❌ Firestore Subscribe Error:", err);
      });
    }
    return () => {};
  },

  saveList: async (userId: string, list: AssociationList) => {
    const isGuest = userId.startsWith(GUEST_PREFIX) || userId.startsWith(DEV_PREFIX);

    if (isGuest && !isLocalhost) {
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
      console.log(`💾 [Service] Guardando en Firestore... ID: ${list.id} para UID: ${userId}`);
      try {
        const listRef = doc(db, COLLECTION_NAME, list.id);
        const payload = {
          ...list,
          userId,
          updatedAt: Date.now()
        };
        await setDoc(listRef, payload, { merge: true });
        console.log("✨ [Service] Guardado exitoso.");
      } catch (e) {
        console.error("❌ [Service] Error al guardar en Firestore:", e);
      }
    }
  },

  deleteList: async (userId: string, listId: string) => {
    const isGuest = userId.startsWith(GUEST_PREFIX) || userId.startsWith(DEV_PREFIX);

    if (isGuest && !isLocalhost) {
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
      console.log(`🗑️ [Service] Eliminando lista ${listId}`);
      await deleteDoc(doc(db, COLLECTION_NAME, listId));
    }
  }
};
