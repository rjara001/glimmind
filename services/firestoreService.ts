
import { db, collection, query, where, doc, setDoc, deleteDoc, isConfigured, getDocs } from '../firebase';
import { AssociationList } from '../types';

const COLLECTION_NAME = "lists";

export const listService = {
  /**
   * Carga inicial: Prioriza LocalStorage para velocidad instantánea, 
   * luego intenta refrescar desde Firestore.
   */
  fetchInitialLists: async (userId: string): Promise<AssociationList[]> => {
    if (!userId) return [];
    
    const localData = localStorage.getItem(`glimmind_cache_${userId}`);
    const cachedLists = localData ? JSON.parse(localData) : [];

    if (isConfigured && db) {
      try {
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const remoteLists = snapshot.docs.map(d => d.data() as AssociationList);
        
        // Guardar en cache lo que viene de la nube
        localStorage.setItem(`glimmind_cache_${userId}`, JSON.stringify(remoteLists));
        return remoteLists.length > 0 ? remoteLists : cachedLists;
      } catch (e) {
        console.warn("Modo Offline: Usando datos de LocalStorage.");
        return cachedLists;
      }
    }
    return cachedLists;
  },

  /**
   * Sincronización Manual: Toma todas las listas locales y las empuja a la nube.
   */
  syncAllToCloud: async (userId: string, lists: AssociationList[]) => {
    if (!isConfigured || !db || !userId) return;
    
    console.log(`☁️ Sincronizando ${lists.length} listas con GCP...`);
    const batchPromises = lists.map(list => {
      const listRef = doc(db, COLLECTION_NAME, list.id);
      // Aseguramos que el userId esté presente
      return setDoc(listRef, { ...list, userId, updatedAt: Date.now() }, { merge: true });
    });

    await Promise.all(batchPromises);
    console.log("✅ Sincronización completada con éxito.");
  },

  /**
   * Guardado Directo: Usado para creaciones nuevas o cargas masivas (CSV).
   */
  saveToCloudDirect: async (userId: string, list: AssociationList) => {
    if (!isConfigured || !db) return;
    const listRef = doc(db, COLLECTION_NAME, list.id);
    await setDoc(listRef, { ...list, userId, updatedAt: Date.now() }, { merge: true });
  },

  deleteFromCloud: async (listId: string) => {
    if (isConfigured && db) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, listId));
      } catch (e) {
        console.error("Error al borrar de la nube:", e);
      }
    }
  }
};
