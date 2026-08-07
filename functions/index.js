const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();
const COLLECTION_NAME = "lists";

const DEFAULT_CARD_QUOTA = 1000;
const PREMIUM_CARD_QUOTA = 5000;
const DEFAULT_AI_DAILY_QUOTA = 3;
const PREMIUM_AI_DAILY_QUOTA = 10;
const GLOBAL_AI_DAILY_CAP = 200;
const MAX_CARDS_PER_LIST = 3000;
const MAX_CARDS_PER_AI_REQUEST = 2000;
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

class QuotaExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function metaRefFor(userId) {
  return db.collection("users").doc(userId).collection("meta").doc("main");
}

async function getOrCreateMeta(userId) {
  const metaRef = metaRefFor(userId);
  const snap = await metaRef.get();
  if (snap.exists) {
    return { ref: metaRef, data: snap.data() };
  }
  const listsSnap = await db.collection(COLLECTION_NAME).where("userId", "==", userId).get();
  const cardCount = listsSnap.docs.reduce((sum, doc) => {
    const associations = doc.data().associations;
    return sum + (Array.isArray(associations) ? associations.length : 0);
  }, 0);
  const data = {
    tier: "free",
    cardQuota: DEFAULT_CARD_QUOTA,
    cardCount,
    aiQuotaDaily: DEFAULT_AI_DAILY_QUOTA,
    aiUsedToday: 0,
    aiDateKey: todayKey(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await metaRef.set(data);
  return { ref: metaRef, data };
}

function metaDefaults() {
  return {
    tier: "free",
    cardQuota: DEFAULT_CARD_QUOTA,
    cardCount: 0,
    aiQuotaDaily: DEFAULT_AI_DAILY_QUOTA,
    aiUsedToday: 0,
    aiDateKey: todayKey(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function requireAuth(req, res, expectedUserId) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error(`[auth] missing bearer header (path=${req.path})`);
    res.status(401).json({ error: 'Unauthorized', authHeaderPresent: !!authHeader, authPrefix: authHeader ? authHeader.split(' ')[0] : null });
    return null;
  }
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    if (expectedUserId && token.uid !== expectedUserId) {
      console.error(`[auth] uid mismatch (path=${req.path}, expected=${expectedUserId}, got=${token.uid})`);
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }
    return token.uid;
  } catch (error) {
    console.error(`[auth] token verification failed (path=${req.path}): ${error.message}`);
    res.status(401).json({ error: 'Unauthorized', reason: error.message });
    return null;
  }
}

exports.getLists = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

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
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  const count = Array.isArray(associations) ? associations.length : 0;
  if (count > MAX_CARDS_PER_LIST) {
    return res.status(400).json({ error: `Una lista no puede superar ${MAX_CARDS_PER_LIST} tarjetas.` });
  }

  try {
    await getOrCreateMeta(userId);
    const docRef = db.collection(COLLECTION_NAME).doc();
    await db.runTransaction(async (tx) => {
      const metaSnap = await tx.get(metaRefFor(userId));
      const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
      const cardQuota = meta.cardQuota || DEFAULT_CARD_QUOTA;
      const cardCount = meta.cardCount || 0;
      if (count > 0 && cardCount + count > cardQuota) {
        throw new QuotaExceededError(
          `Llegaste a tu límite de ${cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`
        );
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
        tx.update(metaRefFor(userId), {
          cardCount: FieldValue.increment(count),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(metaRefFor(userId), { ...metaDefaults(), cardCount: count });
      }
    });
    res.json({ id: docRef.id });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.updateList = onRequest({ cors: true }, async (req, res) => {
  const { listId, ...updates } = req.body;

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const docRef = db.collection(COLLECTION_NAME).doc(listId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'List not found' });
    }

    const oldData = docSnap.data();
    if (oldData.userId && oldData.userId !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const oldCount = Array.isArray(oldData.associations) ? oldData.associations.length : 0;
    const newCount = Array.isArray(updates.associations) ? updates.associations.length : oldCount;

    if (newCount > MAX_CARDS_PER_LIST && newCount > oldCount) {
      return res.status(400).json({ error: `Una lista no puede superar ${MAX_CARDS_PER_LIST} tarjetas.` });
    }

    if (oldData.userId && newCount > oldCount) {
      await getOrCreateMeta(oldData.userId);
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

      const metaRef = metaRefFor(currentUserId);
      const metaSnap = await tx.get(metaRef);
      const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
      const cardQuota = meta.cardQuota || DEFAULT_CARD_QUOTA;
      const cardCount = meta.cardCount || 0;

      if (delta > 0 && cardCount + delta > cardQuota) {
        throw new QuotaExceededError(
          `Llegaste a tu límite de ${cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`
        );
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
          tx.set(metaRef, {
            ...metaDefaults(),
            cardCount: Math.max(0, delta),
          });
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.deleteList = onRequest({ cors: true }, async (req, res) => {
  const { listId } = req.body;

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const docRef = db.collection(COLLECTION_NAME).doc(listId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'List not found' });
    }

    const { userId, associations } = docSnap.data();
    const ownerId = userId || uid;
    if (userId && userId !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const count = Array.isArray(associations) ? associations.length : 0;

    if (ownerId) {
      await getOrCreateMeta(ownerId);
    }

    await db.runTransaction(async (tx) => {
      const metaRef = metaRefFor(ownerId);
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

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.splitList = onRequest({ cors: true }, async (req, res) => {
  const { listId, groups } = req.body;
  if (!listId || !Array.isArray(groups) || groups.length === 0) {
    return res.status(400).json({ error: 'listId and groups are required' });
  }

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const originalRef = db.collection(COLLECTION_NAME).doc(listId);
    const originalSnap = await originalRef.get();
    if (!originalSnap.exists) {
      return res.status(404).json({ error: 'List not found' });
    }
    const original = originalSnap.data();
    if (original.userId && original.userId !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const originalCount = Array.isArray(original.associations) ? original.associations.length : 0;
    const totalNewCount = groups.reduce(
      (sum, group) => sum + (Array.isArray(group && group.associations) ? group.associations.length : 0),
      0
    );
    // A reorganization never grows the total, so it must not be quota-blocked.
    const delta = totalNewCount - originalCount;

    const createdIds = await db.runTransaction(async (tx) => {
      const metaRef = metaRefFor(uid);
      const metaSnap = await tx.get(metaRef);
      const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
      const cardQuota = meta.cardQuota || DEFAULT_CARD_QUOTA;
      const cardCount = meta.cardCount || 0;

      if (delta > 0 && cardCount + delta > cardQuota) {
        throw new QuotaExceededError(
          `Llegaste a tu límite de ${cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`
        );
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

    res.json({ ids: createdIds });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.getList = onRequest({ cors: true }, async (req, res) => {
  const { listId } = req.body;

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const doc = await db.collection(COLLECTION_NAME).doc(listId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'List not found' });
    }
    if (doc.data().userId && doc.data().userId !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getProgress = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const doc = await db.collection('users').doc(userId).collection('progress').doc('main').get();
    if (!doc.exists) {
      return res.json(null);
    }
    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.updateProgress = onRequest({ cors: true }, async (req, res) => {
  const { userId, progress } = req.body;
  if (!userId || !progress) {
    return res.status(400).json({ error: 'userId and progress are required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    await db.collection('users').doc(userId).collection('progress').doc('main').set({
      ...progress,
      updatedAt: FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getSettings = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const doc = await db.collection('users').doc(userId).collection('settings').doc('main').get();
    if (!doc.exists) {
      return res.json(null);
    }
    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.updateSettings = onRequest({ cors: true }, async (req, res) => {
  const { userId, settings } = req.body;
  if (!userId || !settings || typeof settings.activityHistoryEnabled !== 'boolean') {
    return res.status(400).json({ error: 'userId and settings are required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    await db.collection('users').doc(userId).collection('settings').doc('main').set({
      activityHistoryEnabled: settings.activityHistoryEnabled,
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const MAX_EVENTS_PER_BATCH = 400;
const MAX_ACTIVITY_PAGE = 200;
const MAX_SESSIONS_PAGE = 200;

function toMillis(value) {
  return value && typeof value.toMillis === 'function' ? value.toMillis() : value;
}

exports.appendActivity = onRequest({ cors: true }, async (req, res) => {
  const { userId, events } = req.body;
  if (!userId || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'userId and events are required' });
  }
  if (events.length > MAX_EVENTS_PER_BATCH) {
    return res.status(400).json({ error: `Máximo ${MAX_EVENTS_PER_BATCH} eventos por lote.` });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const activityCollection = db.collection('users').doc(userId).collection('activity');
    const batch = db.batch();
    for (const event of events) {
      const ref = event.id
        ? activityCollection.doc(event.id)
        : activityCollection.doc();
      batch.set(ref, {
        ...event,
        at: Number.isFinite(event.at) ? new Date(event.at) : FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getActivity = onRequest({ cors: true }, async (req, res) => {
  const { userId, cursor, limit = 50, type, listId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    let query = db.collection('users').doc(userId).collection('activity');
    if (type) query = query.where('type', '==', type);
    if (listId) query = query.where('listId', '==', listId);
    query = query.orderBy('at', 'desc').limit(Math.min(limit, MAX_ACTIVITY_PAGE));
    if (cursor) query = query.startAfter(new Date(cursor));

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, ...data, at: toMillis(data.at) };
    });
    const nextCursor = events.length > 0 ? events[events.length - 1].at : undefined;
    res.json({ events, nextCursor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.saveSession = onRequest({ cors: true }, async (req, res) => {
  const { userId, session } = req.body;
  if (!userId || !session || !session.id) {
    return res.status(400).json({ error: 'userId and session are required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    await db.collection('users').doc(userId).collection('sessions').doc(session.id).set({
      ...session,
      startedAt: new Date(session.startedAt),
      endedAt: new Date(session.endedAt),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getSessions = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const snapshot = await db.collection('users').doc(userId).collection('sessions')
      .orderBy('endedAt', 'desc')
      .limit(MAX_SESSIONS_PAGE)
      .get();
    const sessions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startedAt: toMillis(data.startedAt),
        endedAt: toMillis(data.endedAt),
      };
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getQuota = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const { data } = await getOrCreateMeta(userId);
    res.json({
      tier: data.tier,
      cardCount: data.cardCount,
      cardQuota: data.cardQuota,
      aiQuotaDaily: data.aiQuotaDaily,
      aiUsedToday: data.aiUsedToday,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.setUserQuota = onRequest({ cors: true, secrets: ["ADMIN_UIDS"] }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { uid, tier } = req.body;
  if (!uid || (tier !== 'free' && tier !== 'premium')) {
    return res.status(400).json({ error: 'uid and tier (free|premium) are required' });
  }

  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    const adminUids = (process.env.ADMIN_UIDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!adminUids.includes(token.uid)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const cardQuota = tier === 'premium' ? PREMIUM_CARD_QUOTA : DEFAULT_CARD_QUOTA;
    const aiQuotaDaily = tier === 'premium' ? PREMIUM_AI_DAILY_QUOTA : DEFAULT_AI_DAILY_QUOTA;

    const { ref } = await getOrCreateMeta(uid);
    await ref.update({
      tier,
      cardQuota,
      aiQuotaDaily,
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, tier, cardQuota, aiQuotaDaily });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.setUserPremium = onRequest({ cors: true }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    const uid = token.uid;
    const email = token.email;

    if (email !== 'rjara001@gmail.com') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { ref } = await getOrCreateMeta(uid);
    await ref.update({
      tier: 'premium',
      cardQuota: PREMIUM_CARD_QUOTA,
      aiQuotaDaily: PREMIUM_AI_DAILY_QUOTA,
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, tier: 'premium', cardQuota: PREMIUM_CARD_QUOTA, aiQuotaDaily: PREMIUM_AI_DAILY_QUOTA });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.aiGroup = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 900, memory: '512MiB' }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', authHeaderPresent: !!authHeader, authPrefix: authHeader ? authHeader.split(' ')[0] : null });
  }

  const { concept, associations } = req.body;
  const receivedCount = Array.isArray(associations) ? associations.length : 0;
  if (receivedCount < 3) {
    return res.status(400).json({ error: 'Se necesitan al menos 3 elementos para usar la IA.' });
  }
  const dataToProcess = (Array.isArray(associations) ? associations : []).slice(0, MAX_CARDS_PER_AI_REQUEST);
  const processedCount = dataToProcess.length;

  let uid;
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = token.uid;
  } catch (error) {
    console.error(`[aiGroup] token verification failed: ${error.message}`);
    return res.status(401).json({ error: 'Unauthorized', reason: error.message });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'El servicio de IA no está configurado.' });
  }

  try {
    await getOrCreateMeta(uid);
    const metaRef = metaRefFor(uid);
    const globalRef = db.collection('usage').doc('global');
    const today = todayKey();

    const metaSnap = await metaRef.get();
    const meta = metaSnap.data();
    const aiQuotaDaily = meta.aiQuotaDaily || DEFAULT_AI_DAILY_QUOTA;
    const aiUsedToday = meta.aiDateKey === today ? (meta.aiUsedToday || 0) : 0;
    if (aiUsedToday >= aiQuotaDaily) {
      return res.status(429).json({
        error: `Llegaste a tu límite diario de IA (${aiQuotaDaily} usos). Vuelve mañana.`,
      });
    }

    const globalSnap = await globalRef.get();
    const globalData = globalSnap.exists ? globalSnap.data() : { dateKey: today, aiCalls: 0 };
    const globalCalls = globalData.dateKey === today ? (globalData.aiCalls || 0) : 0;
    if (globalCalls >= GLOBAL_AI_DAILY_CAP) {
      return res.status(429).json({ error: 'El servicio de IA alcanzó su límite diario. Intenta mañana.' });
    }

    const lines = dataToProcess
      .map((a, index) => `${index}|${a.term}|${a.definition}`)
      .join('\n');

    const prompt = `Actúa como un experto en mnemotecnia. Analiza estas asociaciones de "${concept || ''}" y agrúpalas en categorías lógicas para facilitar su memorización.

DATOS DE ENTRADA:
${lines}

REQUISITOS:
- Devuelve un array JSON.
- Estructura: [{"groupName": "nombre", "indices": [0, 1, ...]}]`;

    const RETRIES_PER_MODEL = 2;
    const RETRY_BASE_DELAY_MS = 3000;
    const PER_CALL_TIMEOUT_MS = 300000;
    const sleepWithJitter = (attempt) => {
      const baseDelay = RETRY_BASE_DELAY_MS * (2 ** attempt);
      const jitter = Math.floor(Math.random() * 1000);
      return new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    };

    let result;
    try {
      let lastError = null;
      modelLoop:
      for (const model of GEMINI_MODELS) {
        for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
          const attemptStartedAt = Date.now();
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-goog-api-key': apiKey,
                },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: 'application/json' },
                }),
                signal: AbortSignal.timeout(PER_CALL_TIMEOUT_MS),
              }
            );

            if (!response.ok) {
              const bodyText = await response.text().catch(() => '');
              lastError = new Error(`Gemini HTTP ${response.status}`);
              lastError.code = response.status === 429 ? 'RATE_LIMITED' : 'GEMINI_ERROR';
              console.error(`[AI] model=${model} attempt ${attempt + 1}/${RETRIES_PER_MODEL} failed: status=${response.status} latency=${Date.now() - attemptStartedAt}ms body=${bodyText.slice(0, 300)}`);
              if (response.status === 429 || response.status >= 500) {
                if (attempt < RETRIES_PER_MODEL - 1) {
                  await sleepWithJitter(attempt);
                  continue;
                }
                continue modelLoop;
              }
              throw lastError;
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
              lastError = new Error('Respuesta vacía de la IA.');
              lastError.code = 'GEMINI_ERROR';
              if (attempt < RETRIES_PER_MODEL - 1) {
                await sleepWithJitter(attempt);
                continue;
              }
              continue modelLoop;
            }
            result = JSON.parse(text.trim());
            break modelLoop;
          } catch (error) {
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
              lastError = new Error(`La IA tardó demasiado en responder (más de ${PER_CALL_TIMEOUT_MS / 1000} segundos).`);
              lastError.code = 'GEMINI_ERROR';
              console.error(`[AI] model=${model} attempt ${attempt + 1}/${RETRIES_PER_MODEL} timed out after ${PER_CALL_TIMEOUT_MS / 1000}s`);
              if (attempt < RETRIES_PER_MODEL - 1) {
                await sleepWithJitter(attempt);
                continue;
              }
              continue modelLoop;
            }
            throw error;
          }
        }
      }

      if (result === undefined) {
        throw lastError || new Error('Error desconocido de la IA.');
      }
      result = result
        .filter((group) => group && typeof group.groupName === 'string')
        .map((group) => ({
          groupName: group.groupName,
          indices: Array.isArray(group.indices)
            ? group.indices.filter((i) => Number.isInteger(i) && i >= 0 && i < processedCount)
            : [],
        }))
        .filter((group) => group.indices.length > 0);
    } catch (error) {
      console.error('[AI] Gemini call failed:', error.message);
      if (error.code === 'RATE_LIMITED') {
        return res.status(503).json({
          error: 'El servicio de IA está temporalmente saturado. Intenta en unos minutos.',
        });
      }
      return res.status(502).json({ error: 'Error al procesar la lista con IA.' });
    }

    await metaRef.update({
      aiUsedToday: aiUsedToday + 1,
      aiDateKey: today,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await globalRef.set({ dateKey: today, aiCalls: globalCalls + 1 }, { merge: true });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
