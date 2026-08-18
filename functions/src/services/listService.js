const { COLLECTION_NAME } = require("../utils/constants");
const { getOrCreateMeta, metaDefaults, metaRefFor, QuotaExceededError } = require("../utils/helpers");
const { FieldValue } = require("../utils/firebase");
const { DEFAULT_CARD_QUOTA, PREMIUM_CARD_QUOTA, MAX_CARDS_PER_LIST } = require("../utils/constants");

async function fetchAllListsForUser(db, userId) {
  const snapshot = await db.collection(COLLECTION_NAME)
    .where("userId", "==", userId)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function resolveListCardLimit(userTier) {
  const isPremium = userTier === "premium";
  const maxAllowed = isPremium ? PREMIUM_CARD_QUOTA : MAX_CARDS_PER_LIST;
  return { isPremium, maxAllowed };
}

function validateListDoesNotExceedCardLimit(associations, maxAllowed) {
  const count = Array.isArray(associations) ? associations.length : 0;
  if (count > maxAllowed) {
    throw new QuotaExceededError(`Una lista no puede superar ${maxAllowed} tarjetas.`);
  }
  return count;
}

async function loadUserMetaForCardQuota(db, userId) {
  await getOrCreateMeta(db, userId);
  const metaSnap = await metaRefFor(db, userId).get();
  const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
  return meta;
}

function validateUserCardQuotaNotExceeded(meta, newCardsCount) {
  const cardQuota = meta.cardQuota || DEFAULT_CARD_QUOTA;
  const cardCount = meta.cardCount || 0;
  const { isPremium } = resolveListCardLimit(meta.tier);
  
  if (!isPremium && newCardsCount > 0 && cardCount + newCardsCount > cardQuota) {
    throw new QuotaExceededError(`Llegaste a tu límite de ${cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
  }
  return { cardQuota, cardCount, isPremium };
}

function buildListDocumentData({ userId, name, concept, associations, settings }) {
  return {
    userId,
    name,
    concept,
    associations,
    settings,
    isArchived: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function buildMetaDocumentDataForListCreation(meta, newCardsCount) {
  return {
    ...metaDefaults(),
    cardCount: newCardsCount,
  };
}

async function persistNewListWithAssociations(db, userId, { name, concept, associations, settings }) {
  const meta = await loadUserMetaForCardQuota(db, userId);
  const { maxAllowed } = resolveListCardLimit(meta.tier);
  validateListDoesNotExceedCardLimit(associations, maxAllowed);
  const { cardQuota, cardCount, isPremium } = validateUserCardQuotaNotExceeded(meta, associations.length);

  const docRef = db.collection(COLLECTION_NAME).doc();
  await db.runTransaction(async (tx) => {
    const metaSnap = await tx.get(metaRefFor(db, userId));
    const currentMeta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    const currentCardCount = currentMeta.cardCount || 0;
    const currentIsPremium = currentMeta.tier === "premium";
    
    if (!currentIsPremium && associations.length > 0 && currentCardCount + associations.length > (currentMeta.cardQuota || DEFAULT_CARD_QUOTA)) {
      throw new QuotaExceededError(`Llegaste a tu límite de ${currentMeta.cardQuota || DEFAULT_CARD_QUOTA} tarjetas. Elimina o archiva tarjetas para añadir más.`);
    }

    tx.set(docRef, buildListDocumentData({ userId, name, concept, associations, settings }));
    
    if (metaSnap.exists) {
      tx.update(metaRefFor(db, userId), {
        cardCount: FieldValue.increment(associations.length),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(metaRefFor(db, userId), buildMetaDocumentDataForListCreation(currentMeta, associations.length));
    }
  });
  return { id: docRef.id };
}

async function loadListOwnershipInfo(db, listId, uid) {
  const docRef = db.collection(COLLECTION_NAME).doc(listId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new Error("List not found");
  }
  const oldData = docSnap.data();
  if (oldData.userId && oldData.userId !== uid) {
    throw new Error("Forbidden");
  }
  return { docRef, oldData };
}

function calculateCardCountDelta(oldAssociations, newAssociations) {
  const oldCount = Array.isArray(oldAssociations) ? oldAssociations.length : 0;
  const newCount = Array.isArray(newAssociations) ? newAssociations.length : oldCount;
  return newCount - oldCount;
}

async function applyUpdatesToListAndAdjustCardCounters(db, listId, uid, updates) {
  const { docRef, oldData } = await loadListOwnershipInfo(db, listId, uid);
  const currentUserId = oldData.userId || uid;
  
  const meta = await loadUserMetaForCardQuota(db, currentUserId);
  const { maxAllowed } = resolveListCardLimit(meta.tier);
  const delta = calculateCardCountDelta(oldData.associations, updates.associations);
  const newTotalCount = Array.isArray(oldData.associations) ? oldData.associations.length : 0;
  
  if (newTotalCount + delta > maxAllowed && delta > 0) {
    throw new QuotaExceededError(`Una lista no puede superar ${maxAllowed} tarjetas.`);
  }

  await db.runTransaction(async (tx) => {
    const currentSnap = await tx.get(docRef);
    if (!currentSnap.exists) return;
    
    const currentData = currentSnap.data();
    const currentUserId = currentData.userId || uid;
    const currentOldCount = Array.isArray(currentData.associations) ? currentData.associations.length : 0;
    const currentDelta = calculateCardCountDelta(currentData.associations, updates.associations);
    
    const metaRef = metaRefFor(db, currentUserId);
    const metaSnap = await tx.get(metaRef);
    const currentMeta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    validateUserCardQuotaNotExceeded(currentMeta, currentDelta);
    
    tx.update(docRef, {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    if (currentDelta !== 0) {
      if (metaSnap.exists) {
        tx.update(metaRef, {
          cardCount: FieldValue.increment(currentDelta),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(metaRef, { ...metaDefaults(), cardCount: Math.max(0, currentDelta) });
      }
    }
  });
  return { success: true };
}

async function removeListAndDecrementUserCardCount(db, listId, uid) {
  const docRef = db.collection(COLLECTION_NAME).doc(listId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new Error("List not found");
  }

  const { userId, associations } = docSnap.data();
  const ownerId = userId || uid;
  if (userId && userId !== uid) {
    throw new Error("Forbidden");
  }

  const count = Array.isArray(associations) ? associations.length : 0;

  if (ownerId) {
    await getOrCreateMeta(db, ownerId);
  }

  await db.runTransaction(async (tx) => {
    const metaRef = metaRefFor(db, ownerId);
    const metaSnap = await tx.get(metaRef);
    if (!metaSnap.exists) {
      tx.set(metaRef, metaDefaults());
    }
    tx.delete(docRef);
    if (count > 0) {
      tx.update(metaRef, {
        cardCount: FieldValue.increment(-count),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
  return { success: true };
}

async function divideOriginalListIntoGroupsAndReplaceIt(db, listId, uid, groups) {
  const originalRef = db.collection(COLLECTION_NAME).doc(listId);
  const originalSnap = await originalRef.get();
  if (!originalSnap.exists) {
    throw new Error("List not found");
  }
  const original = originalSnap.data();
  if (original.userId && original.userId !== uid) {
    throw new Error("Forbidden");
  }

  const originalCount = Array.isArray(original.associations) ? original.associations.length : 0;
  const totalNewCount = groups.reduce(
    (sum, group) => sum + (Array.isArray(group && group.associations) ? group.associations.length : 0),
    0
  );
  const delta = totalNewCount - originalCount;

  const createdIds = await db.runTransaction(async (tx) => {
    const metaRef = metaRefFor(db, uid);
    const metaSnap = await tx.get(metaRef);
    const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    validateUserCardQuotaNotExceeded(meta, delta);

    const newRefs = [];
    for (const group of groups) {
      const ref = db.collection(COLLECTION_NAME).doc();
      tx.set(ref, {
        userId: uid,
        name: group.name,
        concept: original.concept,
        associations: Array.isArray(group.associations) ? group.associations : [],
        settings: original.settings,
        isArchived: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      newRefs.push(ref.id);
    }

    tx.delete(originalRef);
    if (delta !== 0) {
      if (metaSnap.exists) {
        tx.update(metaRef, {
          cardCount: FieldValue.increment(delta),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(metaRef, { ...metaDefaults(), cardCount: Math.max(0, delta) });
      }
    }
    return newRefs;
  });

  return { ids: createdIds };
}

async function fetchListByIdForUser(db, listId, uid) {
  const doc = await db.collection(COLLECTION_NAME).doc(listId).get();
  if (!doc.exists) {
    throw new Error("List not found");
  }
  if (doc.data().userId && doc.data().userId !== uid) {
    throw new Error("Forbidden");
  }
  return { id: doc.id, ...doc.data() };
}

module.exports = {
  fetchAllListsForUser,
  persistNewListWithAssociations,
  applyUpdatesToListAndAdjustCardCounters,
  removeListAndDecrementUserCardCount,
  divideOriginalListIntoGroupsAndReplaceIt,
  fetchListByIdForUser,
};
