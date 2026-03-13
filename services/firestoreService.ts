
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { AssociationList } from '../types';

const COLLECTION_NAME = "associationLists";

export const listService = {

  fetchListsByUser: async (userId: string): Promise<AssociationList[]> => {
    if (!userId) return [];
    try {
      // REVERTING TO THE PREVIOUS, WORKING QUERY
      const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AssociationList));
    } catch (error) {
      console.error("Error fetching lists by user:", error);
      return [];
    }
  },

  createList: async (list: Omit<AssociationList, 'id'>): Promise<string> => {
    try {
      const docRef = doc(collection(db, COLLECTION_NAME));
      await setDoc(docRef, { ...list, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return docRef.id;
    } catch (error) {
      console.error("Error creating list:", error);
      throw error;
    }
  },

  getList: async (listId: string): Promise<AssociationList | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, listId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as AssociationList;
      }
      return null;
    } catch (error) {
      console.error("Error getting list:", error);
      return null;
    }
  },

  updateList: async (listId: string, updates: Partial<AssociationList>): Promise<void> => {
    try {
      const listRef = doc(db, COLLECTION_NAME, listId);
      await updateDoc(listRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error("Error updating list:", error);
      throw error;
    }
  },

  deleteList: async (listId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, listId));
    } catch (error) {
      console.error("Error deleting list:", error);
      throw error;
    }
  },

  createMultipleLists: async (lists: Omit<AssociationList, 'id'>[]): Promise<void> => {
    try {
      const batch = writeBatch(db);
      lists.forEach(list => {
        const docRef = doc(collection(db, COLLECTION_NAME));
        batch.set(docRef, { ...list, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error creating multiple lists:", error);
      throw error;
    }
  },
};
