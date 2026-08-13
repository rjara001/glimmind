const { COLLECTION_NAME } = require("../utils/constants");

async function getLists(db, userId) {
  const snapshot = await db.collection(COLLECTION_NAME)
    .where("userId", "==", userId)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function createList(db, userId, { name, concept, associations, settings }) {
  const { getOrCreateMeta, metaDefaults, metaRefFor, QuotaExceededError } = require("../utils/helpers");
  const { FieldValue } = require("../utils/firebase");
  const { DEFAULT_CARD_QUOTA, PREMIUM_CARD_QUOTA, MAX_CARDS_PER_LIST } = require("../utils/constants");

  await getOrCreateMeta(db, userId);
  const metaSnap = await metaRefFor(db, userId).get();
  const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
  const isPremium = meta.tier === "premium";

  const count = Array.isArray(associations) ? associations.length : 0;
  const maxAllowed = isPremium ? PREMIUM_CARD_QUOTA : MAX_CARDS_PER_LIST;
  if (count > maxAllowed) {
    throw new QuotaExceededError(`Una lista no puede superar ${maxAllowed} tarjetas.`);
  }

  const docRef = db.collection(COLLECTION_NAME).doc();
  await db.runTransaction(async (tx) => {
    const metaSnap = await tx.get(require("../utils/helpers").metaRefFor(db, userId));
    const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    const cardQuota = meta.cardQuota || DEFAULT_CARD_QUOTA;
    const cardCount = meta.cardCount || 0;
    const isPremium = meta.tier === "premium";
    console.log("[DEBUG][createList] userId=", userId, "cardQuota=", cardQuota, "cardCount=", cardCount, "count=", count, "isPremium=", isPremium);
    if (!isPremium && count > 0 && cardCount + count > cardQuota) {
      throw new QuotaExceededError(`Llegaste a tu límite de ${cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
    }
    tx.set(docRef, {
      userId,
      name,
      concept,
      associations,
      settings,
      isArchived: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (metaSnap.exists) {
      tx.update(require("../utils/helpers").metaRefFor(db, userId), {
        cardCount: FieldValue.increment(count),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(require("../utils/helpers").metaRefFor(db, userId), { ...metaDefaults(), cardCount: count });
    }
  });
  return { id: docRef.id };
}

async function updateList(db, listId, uid, updates) {
  const { getOrCreateMeta, metaDefaults, metaRefFor, QuotaExceededError } = require("../utils/helpers");
  const { FieldValue } = require("../utils/firebase");
  const { DEFAULT_CARD_QUOTA, PREMIUM_CARD_QUOTA, MAX_CARDS_PER_LIST } = require("../utils/constants");

  const docRef = db.collection(COLLECTION_NAME).doc(listId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new Error("List not found");
  }

  const oldData = docSnap.data();
  if (oldData.userId && oldData.userId !== uid) {
    throw new Error("Forbidden");
  }

  const currentUserId = oldData.userId || uid;
  const metaSnap = await metaRefFor(db, currentUserId).get();
  const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
  const isPremium = meta.tier === "premium";

  const oldCount = Array.isArray(oldData.associations) ? oldData.associations.length : 0;
  const newCount = Array.isArray(updates.associations) ? updates.associations.length : oldCount;

  const maxAllowed = isPremium ? PREMIUM_CARD_QUOTA : MAX_CARDS_PER_LIST;
  console.log("[updateList] uid=", uid, "currentUserId=", currentUserId, "isPremium=", isPremium, "oldCount=", oldCount, "newCount=", newCount, "maxAllowed=", maxAllowed, "meta=", JSON.stringify(meta));
  if (newCount > maxAllowed && newCount > oldCount) {
    throw new QuotaExceededError(`Una lista no puede superar ${maxAllowed} tarjetas.`);
  }

  if (oldData.userId && newCount > oldCount) {
    await getOrCreateMeta(db, oldData.userId);
  }

  await db.runTransaction(async (tx) => {
    const currentSnap = await tx.get(docRef);
    if (!currentSnap.exists) {
      return;
    }
    const currentData = currentSnap.data();
    const currentUserId = currentData.userId || uid;
    const currentOldCount = Array.isArray(currentData.associations) ? currentData.associations.length : 0;
    const delta = newCount - currentOldCount;

    const metaRef = require("../utils/helpers").metaRefFor(db, currentUserId);
    const metaSnap = await tx.get(metaRef);
    const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    const cardQuota = meta.cardQuota || DEFAULT_CARD_QUOTA;
    const cardCount = meta.cardCount || 0;
    const isPremium = meta.tier === "premium";

    console.log("[updateList][tx] currentUserId=", currentUserId, "isPremium=", isPremium, "delta=", delta, "cardQuota=", cardQuota, "cardCount=", cardCount);
    if (!isPremium && delta > 0 && cardCount + delta > cardQuota) {
      throw new QuotaExceededError(`Llegaste a tu límite de ${cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
    }

    tx.update(docRef, {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
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
  });
  return { success: true };
}

async function deleteList(db, listId, uid) {
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
    await require("../utils/helpers").getOrCreateMeta(db, ownerId);
  }

  const { metaDefaults, metaRefFor } = require("../utils/helpers");
  const { FieldValue } = require("../utils/firebase");

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

async function splitList(db, listId, uid, groups) {
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

  const { metaDefaults, QuotaExceededError, metaRefFor } = require("../utils/helpers");
  const { FieldValue } = require("../utils/firebase");

  const createdIds = await db.runTransaction(async (tx) => {
    const metaRef = metaRefFor(db, uid);
    const metaSnap = await tx.get(metaRef);
    const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
    const cardQuota = meta.cardQuota || DEFAULT_CARD_QUOTA;
    const cardCount = meta.cardCount || 0;
    const isPremium = meta.tier === "premium";

    if (!isPremium && delta > 0 && cardCount + delta > cardQuota) {
      throw new QuotaExceededError(`Llegaste a tu límite de ${cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
    }

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

async function getList(db, listId, uid) {
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
  getLists,
  createList,
  updateList,
  deleteList,
  splitList,
  getList,
};
