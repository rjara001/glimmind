
import { db, collection, query, where, doc, setDoc, deleteDoc, isConfigured, getDocs } from '../firebase';
import { AssociationList } from '../types';

const COLLECTION_NAME = "lists";

export const listService = {
  /**
   * Carga inicial con Merge Inteligente:
   * No sobreescribe cambios locales que sean más recientes que los de la nube.
   */
  fetchInitialLists: async (userId: string): Promise<AssociationList[]> => {
    if (!userId) return [];
    
    const localData = localStorage.getItem(`glimmind_cache_${userId}`);
    const cachedLists: AssociationList[] = localData ? JSON.parse(localData) : [];

    if (isConfigured && db) {
      try {
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const remoteLists = snapshot.docs.map(d => d.data() as AssociationList);
        
        // --- Lógica de Merge ---
        const mergedLists = [...cachedLists];

        remoteLists.forEach(remote => {
          const localIndex = mergedLists.findIndex(l => l.id === remote.id);
          
          if (localIndex === -1) {
            // Si no existe localmente, la agregamos
            mergedLists.push(remote);
          } else {
            // Si existe en ambos, comparamos timestamps
            const local = mergedLists[localIndex];
            const remoteTime = remote.updatedAt || 0;
            const localTime = local.updatedAt || 0;

            if (remoteTime > localTime) {
              // La nube es más nueva, actualizamos local
              mergedLists[localIndex] = remote;
            } else {
              // Lo local es más nuevo o igual (cambios pendientes), mantenemos local
              console.log(`📍 Manteniendo cambios locales pendientes para: ${local.name}`);
            }
          }
        });

        // Actualizar el cache local con el resultado del merge
        localStorage.setItem(`glimmind_cache_${userId}`, JSON.stringify(mergedLists));
        return mergedLists;
      } catch (e) {
        console.warn("Modo Offline: Usando datos de LocalStorage exclusivamente.");
        return cachedLists;
      }
    }
    return cachedLists;
  },

  syncAllToCloud: async (userId: string, lists: AssociationList[]) => {
    if (!isConfigured || !db || !userId) return;
    
    console.log(`☁️ Sincronizando ${lists.length} listas con GCP...`);
    const batchPromises = lists.map(list => {
      const listRef = doc(db, COLLECTION_NAME, list.id);
      return setDoc(listRef, { ...list, userId, updatedAt: list.updatedAt || Date.now() }, { merge: true });
    });

    await Promise.all(batchPromises);
    console.log("✅ Sincronización completada.");
  },

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
