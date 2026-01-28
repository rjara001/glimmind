
import { db, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, isConfigured } from '../firebase';
import { AssociationList } from '../types';

const COLLECTION_NAME = "lists";

// Detectar si estamos en local para forzar uso de base de datos
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const listService = {
  subscribeToLists: (userId: string, onUpdate: (lists: AssociationList[]) => void) => {
    if (!userId) return () => {};

    // Si no es local y es un invitado, usamos localStorage por persistencia simple
    if (!isLocal && userId.startsWith("guest-")) {
      const loadLocal = () => {
        const saved = localStorage.getItem(`glimmind_lists_${userId}`);
        onUpdate(saved ? JSON.parse(saved) : []);
      };
      loadLocal();
      window.addEventListener('storage', loadLocal);
      return () => window.removeEventListener('storage', loadLocal);
    }

    if (isConfigured && db) {
      console.log(`📡 [Firestore] Suscribiendo UID: ${userId} en modo ${isLocal ? 'LOCAL EMULATOR' : 'CLOUD'}`);
      const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
      
      return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(d => ({ ...d.data() } as AssociationList));
        console.log(`📦 [Firestore] ${lists.length} listas recuperadas para el usuario.`);
        onUpdate(lists);
      }, (err) => {
        console.error("❌ [Firestore] Error en suscripción:", err);
      });
    }
    return () => {};
  },

  saveList: async (userId: string, list: AssociationList) => {
    if (!userId) throw new Error("userId es requerido");

    // Lógica localStorage solo para producción sin login
    if (!isLocal && userId.startsWith("guest-")) {
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
      console.log(`💾 [Firestore] Intentando guardar lista "${list.name}"...`);
      try {
        const listRef = doc(db, COLLECTION_NAME, list.id);
        const payload = {
          ...list,
          userId,
          updatedAt: Date.now()
        };
        await setDoc(listRef, payload, { merge: true });
        console.log("✅ [Firestore] Guardado con éxito en el emulador.");
      } catch (e) {
        console.error("❌ [Firestore] Error crítico al guardar:", e);
        throw e;
      }
    }
  },

  deleteList: async (userId: string, listId: string) => {
    if (isConfigured && db) {
      console.log(`🗑️ [Firestore] Eliminando lista ${listId}`);
      await deleteDoc(doc(db, COLLECTION_NAME, listId));
    }
  }
};
