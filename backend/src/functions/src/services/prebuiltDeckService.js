const DECKS_COLLECTION = "prebuiltDecks";

async function fetchAllActiveDecks(db) {
  const snapshot = await db
    .collection(DECKS_COLLECTION)
    .where("active", "==", true)
    .orderBy("order", "asc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

module.exports = { fetchAllActiveDecks };
