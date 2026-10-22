const { getDb } = require("../../utils/firebase");
const { getOrCreateMeta, metaDefaults, metaRefFor } = require("../../utils/helpers");
const { FieldValue } = require("../../utils/firebase");
const { COLLECTION_NAME, MAX_CARDS_PER_LIST, DEFAULT_BULK_CARDS_PER_DECK } = require("../../utils/constants");
const { applyDeltasToList } = require("../../utils/associationDeltas");
const { assertCardQuotaHasRoom, assertDeckQuotaHasRoom, validateListDoesNotExceedCardLimit, validateUserCardQuotaNotExceeded, loadUserMetaForCardQuota, resolveListCount } = require("./quota");

function buildListDocumentData({ userId, name, concept, associations, settings, sourceType, sourceUrl, rawSourceText, sourceRow }) {
  return {
    userId,
    name,
    concept,
    associations,
    settings,
    ...(sourceType !== undefined ? { sourceType } : {}),
    ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    ...(rawSourceText !== undefined ? { rawSourceText } : {}),
    ...(sourceRow !== undefined ? { sourceRow } : {}),
    isArchived: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function buildMetaDocumentDataForListCreation(meta, newCardsCount, newDecksCount) {
  return {
    ...metaDefaults(),
    cardCount: newCardsCount,
    listCount: newDecksCount,
  };
}

function computeProgressSummary(associations) {
  if (!Array.isArray(associations)) {
    return '[CLOUD_PROGRESS] No associations array';
  }
  const total = associations.length;
  let active = 0;
  let archived = 0;
  const breakdown = { nuevas: 0, vistas: 0, reconocidas: 0, frecuentes: 0, aprendidas: 0 };
  
  for (const a of associations) {
    if (a.isArchived) {
      archived++;
      continue;
    }
    active++;
    if (a.isLearned) {
      breakdown.aprendidas++;
    } else {
      switch (a.currentCycle) {
        case 4: breakdown.frecuentes++; break;
        case 3: breakdown.reconocidas++; break;
        case 2: breakdown.vistas++; break;
        default: breakdown.nuevas++;
      }
    }
  }
  
  const totalActive = breakdown.nuevas + breakdown.vistas + breakdown.reconocidas + breakdown.frecuentes + breakdown.aprendidas;
  const progressPct = totalActive > 0 ? Math.round((breakdown.aprendidas / totalActive) * 100) : 0;
  
  return `[CLOUD_PROGRESS] Total: ${total} (Active: ${active}, Archived: ${archived}) | N: ${breakdown.nuevas} V: ${breakdown.vistas} R: ${breakdown.reconocidas} F: ${breakdown.frecuentes} ✅: ${breakdown.aprendidas} (${progressPct}%)`;
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

async function fetchAllListsForUser(db, userId) {
  const snapshot = await db.collection(COLLECTION_NAME)
    .where("userId", "==", userId)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

function effectiveListCount(metaSnapExists, meta, legacyListCount) {
  if (metaSnapExists && typeof meta.listCount === "number") return meta.listCount;
  return legacyListCount ?? 0;
}

function listCountWrite(currentMeta, legacyListCount, delta) {
  // A counter written by metaDefaults/previous writes grows atomically; a meta
  // from before listCount existed gets one absolute backfill write instead,
  // because increment on a missing field would count from 0, not from the
  // decks the user actually owns.
  if (typeof currentMeta.listCount === "number") return FieldValue.increment(delta);
  return (legacyListCount ?? 0) + delta;
}

async function persistNewListWithAssociations(db, userId, { name, concept, associations, settings, sourceType, sourceUrl, rawSourceText, sourceRow }) {
  const meta = await loadUserMetaForCardQuota(db, userId);
  const maxAllowed = meta.tier === "premium" ? Infinity : MAX_CARDS_PER_LIST;
  const count = validateListDoesNotExceedCardLimit(associations, maxAllowed);
  const { cardQuota, cardCount } = validateUserCardQuotaNotExceeded(meta, count);
  const legacyListCount = typeof meta.listCount === "number" ? null : await resolveListCount(db, userId);

  const docRef = db.collection(COLLECTION_NAME).doc();
  await db.runTransaction(async (tx) => {
    const metaSnap = await tx.get(metaRefFor(db, userId));
    const currentMeta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    const currentCardCount = currentMeta.cardCount || 0;
    const currentTier = currentMeta.tier || "free";
    const currentListCount = effectiveListCount(metaSnap.exists, currentMeta, legacyListCount);

    assertCardQuotaHasRoom(currentTier, currentCardCount, count);
    assertDeckQuotaHasRoom(currentTier, currentListCount, 1);

    tx.set(docRef, buildListDocumentData({ userId, name, concept, associations, settings, sourceType, sourceUrl, rawSourceText, sourceRow }));
    
    if (metaSnap.exists) {
      tx.update(metaRefFor(db, userId), {
        cardCount: FieldValue.increment(count),
        listCount: listCountWrite(currentMeta, legacyListCount, 1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(metaRefFor(db, userId), buildMetaDocumentDataForListCreation(currentMeta, count, currentListCount + 1));
    }
  });
  
  // Log cloud progress after successful save
  const savedDoc = await docRef.get();
  if (savedDoc.exists) {
    const savedData = savedDoc.data();
    console.log(`[CLOUD_SAVE] createList ${docRef.id} ${computeProgressSummary(savedData.associations)}`);
  }
  
  return { id: docRef.id };
}

// Single bulk import: splits the payload into decks and writes every deck plus
// the cardCount update in ONE transaction, so an import is atomic (all decks
// or none) and never stops halfway against the createList rate limit.
async function bulkCreateLists(db, userId, { name, concept, associations, settings, cardsPerDeck, sourceType, sourceUrl, rawSourceText, sourceRow }) {
  const deckSize = cardsPerDeck || DEFAULT_BULK_CARDS_PER_DECK;
  const chunks = [];
  for (let i = 0; i < associations.length; i += deckSize) {
    chunks.push(associations.slice(i, i + deckSize));
  }
  const total = associations.length;

  const meta = await loadUserMetaForCardQuota(db, userId);
  const maxAllowed = meta.tier === "premium" ? Infinity : MAX_CARDS_PER_LIST;
  chunks.forEach((chunk) => validateListDoesNotExceedCardLimit(chunk, maxAllowed));
  validateUserCardQuotaNotExceeded(meta, total);
  const legacyListCount = typeof meta.listCount === "number" ? null : await resolveListCount(db, userId);

  const createdIds = await db.runTransaction(async (tx) => {
    const metaSnap = await tx.get(metaRefFor(db, userId));
    const currentMeta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    const currentTier = currentMeta.tier || "free";
    const currentListCount = effectiveListCount(metaSnap.exists, currentMeta, legacyListCount);

    assertCardQuotaHasRoom(currentTier, currentMeta.cardCount || 0, total);
    assertDeckQuotaHasRoom(currentTier, currentListCount, chunks.length);

    const ids = [];
    chunks.forEach((chunk, index) => {
      const deckRef = db.collection(COLLECTION_NAME).doc();
      const deckName = index === 0 ? name : `${name}-${index + 1}`;
      tx.set(deckRef, buildListDocumentData({
        userId,
        name: deckName,
        concept,
        associations: chunk,
        settings,
        sourceType,
        sourceUrl,
        rawSourceText,
        sourceRow,
      }));
      ids.push(deckRef.id);
    });

    if (metaSnap.exists) {
      tx.update(metaRefFor(db, userId), {
        cardCount: FieldValue.increment(total),
        listCount: listCountWrite(currentMeta, legacyListCount, chunks.length),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(metaRefFor(db, userId), buildMetaDocumentDataForListCreation(currentMeta, total, currentListCount + chunks.length));
    }

    return ids;
  });

  return { ids: createdIds };
}

async function applyUpdatesToListAndAdjustCardCounters(db, listId, uid, updates) {
  const { docRef, oldData } = await loadListOwnershipInfo(db, listId, uid);
  const currentUserId = oldData.userId || uid;
  
  const delta = calculateCardCountDelta(oldData.associations, updates.associations);
  
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
    assertCardQuotaHasRoom(currentMeta.tier || "free", currentMeta.cardCount || 0, currentDelta);
    
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
  
  // Log cloud progress after successful update
  const savedDoc = await docRef.get();
  if (savedDoc.exists) {
    const savedData = savedDoc.data();
    console.log(`[CLOUD_SAVE] updateList ${listId} ${computeProgressSummary(savedData.associations)}`);
  }
  
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

  const preDeleteMetaSnap = await metaRefFor(db, ownerId).get();
  const legacyListCount =
    preDeleteMetaSnap.exists && typeof preDeleteMetaSnap.data().listCount === "number"
      ? null
      : await resolveListCount(db, ownerId);

  await db.runTransaction(async (tx) => {
    const metaRef = metaRefFor(db, ownerId);
    const metaSnap = await tx.get(metaRef);
    const currentMeta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    // The resolved count still includes the deck being deleted right now, so a
    // legacy meta (no listCount field yet) gets one absolute backfill write.
    const remainingDecks = Math.max(0, (legacyListCount ?? (currentMeta.listCount || 0)) - 1);
    const metaUpdate = { updatedAt: FieldValue.serverTimestamp() };
    if (count > 0) {
      metaUpdate.cardCount = FieldValue.increment(-count);
    }
    if (metaSnap.exists && typeof currentMeta.listCount === "number") {
      // A counter already at 0 is out of sync with reality; a delete must not
      // drive it negative.
      if (currentMeta.listCount > 0) metaUpdate.listCount = FieldValue.increment(-1);
    } else {
      metaUpdate.listCount = remainingDecks;
    }
    tx.delete(docRef);
    if (metaSnap.exists) {
      tx.update(metaRef, metaUpdate);
    } else {
      tx.set(metaRef, { ...metaDefaults(), ...metaUpdate });
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
  // groups[0] rewrites the original deck in place; every later group is a new
  // deck document, and that count is what the deck ceiling must bound.
  const newDecksCount = Math.max(0, groups.length - 1);

  const preMetaSnap = await metaRefFor(db, uid).get();
  const preMeta = preMetaSnap.exists ? preMetaSnap.data() : metaDefaults();
  const legacyListCount =
    preMetaSnap.exists && typeof preMeta.listCount === "number"
      ? null
      : await resolveListCount(db, uid);

  const createdIds = await db.runTransaction(async (tx) => {
    const metaRef = metaRefFor(db, uid);
    const metaSnap = await tx.get(metaRef);
    const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    validateUserCardQuotaNotExceeded(meta, delta);
    assertCardQuotaHasRoom(meta.tier || "free", meta.cardCount || 0, delta);
    const currentListCount = effectiveListCount(metaSnap.exists, meta, legacyListCount);
    assertDeckQuotaHasRoom(meta.tier || "free", currentListCount, newDecksCount);

    // groups[0] replaces the original deck in place; the original document is
    // never deleted. Deleting it lost the first group's cards, because the
    // client only sends the groups that must become new decks plus this first
    // one (see docs/issues/done/2026-10-15-splitlist-borra-mazo-original.md).
    const firstGroup = groups[0];
    tx.update(originalRef, {
      name: firstGroup.name,
      associations: Array.isArray(firstGroup.associations) ? firstGroup.associations : [],
      updatedAt: FieldValue.serverTimestamp(),
    });

    const affectedIds = [originalRef.id];
    for (const group of groups.slice(1)) {
      const ref = db.collection(COLLECTION_NAME).doc();
      tx.set(ref, {
        userId: uid,
        name: group.name,
        concept: original.concept,
        associations: Array.isArray(group.associations) ? group.associations : [],
        settings: original.settings,
        ...(original.sourceType !== undefined ? { sourceType: original.sourceType } : {}),
        ...(original.sourceUrl !== undefined ? { sourceUrl: original.sourceUrl } : {}),
        ...(original.rawSourceText !== undefined ? { rawSourceText: original.rawSourceText } : {}),
        ...(original.sourceRow !== undefined ? { sourceRow: original.sourceRow } : {}),
        isArchived: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      affectedIds.push(ref.id);
    }

    const hasCardDelta = delta !== 0;
    if (hasCardDelta || newDecksCount > 0) {
      if (metaSnap.exists) {
        const metaUpdate = { updatedAt: FieldValue.serverTimestamp() };
        if (hasCardDelta) metaUpdate.cardCount = FieldValue.increment(delta);
        if (newDecksCount > 0) metaUpdate.listCount = listCountWrite(meta, legacyListCount, newDecksCount);
        tx.update(metaRef, metaUpdate);
      } else {
        tx.set(metaRef, {
          ...metaDefaults(),
          cardCount: Math.max(0, delta),
          listCount: (legacyListCount ?? 0) + newDecksCount,
        });
      }
    }
    return affectedIds;
  });

  return { ids: createdIds };
}

async function logCloudProgress(db, listId, uid) {
  try {
    const doc = await db.collection(COLLECTION_NAME).doc(listId).get();
    if (!doc.exists) {
      console.log(`[CLOUD_PROGRESS] ${listId}: List not found`);
      return;
    }
    const data = doc.data();
    if (data.userId && data.userId !== uid) {
      console.log(`[CLOUD_PROGRESS] ${listId}: Forbidden`);
      return;
    }
    console.log(`[CLOUD_PROGRESS] ${listId} ${computeProgressSummary(data.associations)}`);
  } catch (error) {
    console.error(`[CLOUD_PROGRESS] ${listId}: Error`, error.message);
  }
}

async function updateListFields(db, listId, uid, baseUpdatedAt, deltas) {
  const docRef = db.collection(COLLECTION_NAME).doc(listId);

  await db.runTransaction(async (tx) => {
    const currentSnap = await tx.get(docRef);
    if (!currentSnap.exists) {
      throw new Error("List not found");
    }

    const currentData = currentSnap.data();
    if (currentData.userId && currentData.userId !== uid) {
      throw new Error("Forbidden");
    }

    const currentUpdatedAt = currentData.updatedAt?.toMillis?.() ?? currentData.updatedAt ?? 0;
    if (currentUpdatedAt > baseUpdatedAt) {
      const error = new Error("Concurrent modification");
      error.code = "aborted";
      throw error;
    }

    // The full array is written back on purpose. Partial dotted updates
    // (`associations.<uuid>.<field>`) replace the array with a map keyed by the
    // UUID and destroy term/definition; see
    // docs/issues/P0/2026-10-15-updateListFields-corrompe-associations.md.
    tx.update(docRef, {
      associations: applyDeltasToList(currentData.associations || [], deltas),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  
  // Log cloud progress after successful update
  const savedDoc = await docRef.get();
  if (savedDoc.exists) {
    const savedData = savedDoc.data();
    console.log(`[CLOUD_SAVE] updateListFields ${listId} ${computeProgressSummary(savedData.associations)}`);
  }
  
  return { success: true };
}

module.exports = {
  fetchAllListsForUser,
  fetchListByIdForUser,
  persistNewListWithAssociations,
  bulkCreateLists,
  applyUpdatesToListAndAdjustCardCounters,
  removeListAndDecrementUserCardCount,
  divideOriginalListIntoGroupsAndReplaceIt,
  logCloudProgress,
  updateListFields,
};
