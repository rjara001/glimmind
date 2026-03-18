const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();
const COLLECTION_NAME = "lists";

exports.getLists = onRequest({ cors: true }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('userId', '==', userId)
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.createList = onRequest({ cors: true }, async (req, res) => {
  const { name, concept, associations, settings, userId } = req.body;
  
  try {
    const docRef = await db.collection(COLLECTION_NAME).add({
      userId,
      name,
      concept,
      associations,
      settings,
      isArchived: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.updateList = onRequest({ cors: true }, async (req, res) => {
  const { listId, ...updates } = req.body;
  
  console.log('[UPDATE] Received listId:', listId);
  console.log('[UPDATE] Received updates:', JSON.stringify(updates));
  
  try {
    const docRef = db.collection(COLLECTION_NAME).doc(listId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      console.log('[UPDATE] Document does not exist:', listId);
      return res.status(404).json({ error: 'List not found' });
    }
    
    console.log('[UPDATE] Current doc data:', JSON.stringify(docSnap.data()));
    
    await docRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // Verify the update
    const updatedDoc = await docRef.get();
    console.log('[UPDATE] After update:', JSON.stringify(updatedDoc.data()));
    
    res.json({ success: true });
  } catch (error) {
    console.error('[UPDATE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.deleteList = onRequest({ cors: true }, async (req, res) => {
  const { listId } = req.body;
  
  try {
    await db.collection(COLLECTION_NAME).doc(listId).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getList = onRequest({ cors: true }, async (req, res) => {
  const { listId } = req.body;
  
  try {
    const doc = await db.collection(COLLECTION_NAME).doc(listId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'List not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});