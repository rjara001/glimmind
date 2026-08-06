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
const MAX_CARDS_PER_AI_REQUEST = 10000;
const GEMINI_MODEL = "gemini-2.5-flash-lite";

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

exports.aiGroup = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 540, memory: '512MiB' }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', authHeaderPresent: !!authHeader, authPrefix: authHeader ? authHeader.split(' ')[0] : null });
  }

  const { concept, associations } = req.body;
  const count = Array.isArray(associations) ? associations.length : 0;
  if (count < 3) {
    return res.status(400).json({ error: 'Se necesitan al menos 3 elementos para usar la IA.' });
  }
  if (count > MAX_CARDS_PER_AI_REQUEST) {
    return res.status(400).json({
      error: `La lista tiene ${count} tarjetas. La IA reorganiza máximo ${MAX_CARDS_PER_AI_REQUEST}.`,
    });
  }

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

    const CHUNK_SIZE = MAX_CARDS_PER_LIST;
    const chunks = [];
    for (let start = 0; start < count; start += CHUNK_SIZE) {
      chunks.push(associations.slice(start, start + CHUNK_SIZE));
    }

    const callGemini = async (lines) => {
      const prompt = `Actúa como un experto en mnemotecnia. Analiza estas asociaciones de "${concept || ''}" y agrúpalas en categorías lógicas para facilitar su memorización.

DATOS DE ENTRADA:
${lines}

REQUISITOS:
- Devuelve un array JSON.
- Estructura: [{"groupName": "nombre", "indices": [0, 1, ...]}]`;

      const MAX_GEMINI_RETRIES = 3;
      const RETRY_DELAY_MS = 3000;
      let lastError = null;

      for (let attempt = 0; attempt < MAX_GEMINI_RETRIES; attempt++) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
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
              signal: AbortSignal.timeout(120000),
            }
          );

          if (!response.ok) {
            const error = new Error(`Gemini HTTP ${response.status}`);
            error.code = response.status === 429 ? 'RATE_LIMITED' : 'GEMINI_ERROR';
            lastError = error;
            if (response.status === 429 || response.status >= 500) {
              if (attempt < MAX_GEMINI_RETRIES - 1) {
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
                continue;
              }
            }
            throw error;
          }

          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            const error = new Error('Respuesta vacía de la IA.');
            error.code = 'GEMINI_ERROR';
            lastError = error;
            if (attempt < MAX_GEMINI_RETRIES - 1) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
              continue;
            }
            throw error;
          }
          return JSON.parse(text.trim());
        } catch (error) {
          if (error.name === 'TimeoutError') {
            lastError = new Error('La IA tardó demasiado en responder.');
            lastError.code = 'GEMINI_ERROR';
            if (attempt < MAX_GEMINI_RETRIES - 1) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
              continue;
            }
            throw lastError;
          }
          throw error;
        }
      }

      throw lastError || new Error('Error desconocido de la IA.');
    };

    let rawResults = [];
    try {
      const chunkResults = await Promise.all(
        chunks.map((chunk, chunkIndex) => {
          const baseIndex = chunkIndex * CHUNK_SIZE;
          const lines = chunk
            .map((a, idx) => `${baseIndex + idx}|${a.term}|${a.definition}`)
            .join('\n');
          return callGemini(lines);
        })
      );
      chunkResults.forEach((chunkGroups) => {
        if (Array.isArray(chunkGroups)) {
          rawResults = rawResults.concat(chunkGroups);
        }
      });
    } catch (error) {
      console.error('[AI] Gemini call failed:', error.message);
      if (error.code === 'RATE_LIMITED') {
        return res.status(503).json({
          error: 'El servicio de IA está temporalmente saturado. Intenta en unos minutos.',
        });
      }
      return res.status(502).json({ error: 'Error al procesar la lista con IA.' });
    }

    const result = rawResults
      .filter((group) => group && typeof group.groupName === 'string')
      .map((group) => ({
        groupName: group.groupName,
        indices: Array.isArray(group.indices)
          ? group.indices.filter((i) => Number.isInteger(i) && i >= 0 && i < count)
          : [],
      }))
      .filter((group) => group.indices.length > 0);

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
