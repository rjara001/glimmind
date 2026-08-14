const { onRequest } = require("firebase-functions/v2/https");
const { getDb, FieldValue, getAuth } = require("./src/utils/firebase");
const { requireAuth, metaRefFor, todayKey } = require("./src/utils/helpers");
const { QuotaExceededError } = require("./src/utils/helpers");
const { COLLECTION_NAME, MAX_CARDS_PER_LIST, PREMIUM_CARD_QUOTA } = require("./src/utils/constants");

const listService = require("./src/services/listService");
const progressService = require("./src/services/progressService");
const settingsService = require("./src/services/settingsService");
const activityService = require("./src/services/activityService");
const userService = require("./src/services/userService");
const aiService = require("./src/services/aiService");
const adminService = require("./src/services/adminService");
const chirpTtsService = require("./src/services/chirpTtsService");
const chirpVoicesService = require("./src/services/chirpVoicesService");

exports.getLists = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await listService.getLists(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.createList = onRequest({ cors: true }, async (req, res) => {
  const { name, concept, associations, settings, userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const id = await listService.createList(getDb(), userId, {
      name,
      concept,
      associations,
      settings,
    });
    res.json(id);
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
    const data = await listService.updateList(getDb(), listId, uid, updates);
    res.json(data);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "List not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.deleteList = onRequest({ cors: true }, async (req, res) => {
  const { listId } = req.body;

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const data = await listService.deleteList(getDb(), listId, uid);
    res.json(data);
  } catch (error) {
    if (error.message === "List not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.splitList = onRequest({ cors: true }, async (req, res) => {
  const { listId, groups } = req.body;
  if (!listId || !Array.isArray(groups) || groups.length === 0) {
    return res.status(400).json({ error: "listId and groups are required" });
  }

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const data = await listService.splitList(getDb(), listId, uid, groups);
    res.json(data);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "List not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.getList = onRequest({ cors: true }, async (req, res) => {
  const { listId } = req.body;

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const data = await listService.getList(getDb(), listId, uid);
    res.json(data);
  } catch (error) {
    if (error.message === "List not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.getProgress = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await progressService.getProgress(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.updateProgress = onRequest({ cors: true }, async (req, res) => {
  const { userId, progress } = req.body;
  if (!userId || !progress) {
    return res.status(400).json({ error: "userId and progress are required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await progressService.updateProgress(getDb(), userId, progress);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getSettings = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await settingsService.getSettings(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.updateSettings = onRequest({ cors: true }, async (req, res) => {
  const { userId, settings } = req.body;
  if (!userId || !settings || typeof settings.activityHistoryEnabled !== "boolean") {
    return res.status(400).json({ error: "userId and settings are required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await settingsService.updateSettings(getDb(), userId, settings);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.appendActivity = onRequest({ cors: true }, async (req, res) => {
  const { userId, events } = req.body;
  if (!userId || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: "userId and events are required" });
  }
  if (events.length > 400) {
    return res.status(400).json({ error: "Máximo 400 eventos por lote." });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await activityService.appendActivity(getDb(), userId, events);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getActivity = onRequest({ cors: true }, async (req, res) => {
  const { userId, cursor, limit = 50, type, listId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await activityService.getActivity(getDb(), userId, {
      cursor,
      limit,
      type,
      listId,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.saveSession = onRequest({ cors: true }, async (req, res) => {
  const { userId, session } = req.body;
  if (!userId || !session || !session.id) {
    return res.status(400).json({ error: "userId and session are required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await activityService.saveSession(getDb(), userId, session);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getSessions = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await activityService.getSessions(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getQuota = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await userService.getQuota(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.setUserQuota = onRequest({ cors: true, secrets: ["ADMIN_UIDS"] }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { uid, tier } = req.body;
  if (!uid || (tier !== "free" && tier !== "premium")) {
    return res.status(400).json({ error: "uid and tier (free|premium) are required" });
  }

  try {
    const decoded = await adminService.verifyAdmin(authHeader.slice(7));
    const data = await userService.setUserQuota(getDb(), decoded.uid, uid, tier);
    res.json(data);
  } catch (error) {
    if (error.message === "Forbidden") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.setUserPremium = onRequest({ cors: true }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    const uid = token.uid;
    const email = token.email;
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

    if (!isEmulator && email !== "rjara001@gmail.com") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const data = await userService.setUserPremium(getDb(), uid);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.aiGroup = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 900, memory: "512MiB" }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", authHeaderPresent: !!authHeader, authPrefix: authHeader ? authHeader.split(" ")[0] : null });
  }

  const { concept, associations } = req.body;
  const receivedCount = Array.isArray(associations) ? associations.length : 0;
  if (receivedCount < 3) {
    return res.status(400).json({ error: "Se necesitan al menos 3 elementos para usar la IA." });
  }
  const dataToProcess = (Array.isArray(associations) ? associations : []).slice(0, 2000);
  const processedCount = dataToProcess.length;

  let uid;
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = token.uid;
  } catch (error) {
    console.error(`[aiGroup] token verification failed: ${error.message}`);
    return res.status(401).json({ error: "Unauthorized", reason: error.message });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "El servicio de IA no está configurado." });
  }

  try {
    const metaRef = metaRefFor(getDb(), uid);
    const today = todayKey();
    const globalRef = getDb().collection("usage").doc("global");

    const metaSnap = await metaRef.get();
    const meta = metaSnap.data();
    const aiQuotaDaily = meta.aiQuotaDaily || 3;
    const aiUsedToday = meta.aiDateKey === today ? (meta.aiUsedToday || 0) : 0;
    if (aiUsedToday >= aiQuotaDaily) {
      return res.status(429).json({
        error: `Llegaste a tu límite diario de IA (${aiQuotaDaily} usos). Vuelve mañana.`,
      });
    }

    const globalSnap = await globalRef.get();
    const globalData = globalSnap.exists ? globalSnap.data() : { dateKey: today, aiCalls: 0 };
    const globalCalls = globalData.dateKey === today ? (globalData.aiCalls || 0) : 0;
    if (globalCalls >= 200) {
      return res.status(429).json({ error: "El servicio de IA alcanzó su límite diario. Intenta mañana." });
    }

    const lines = dataToProcess
      .map((a, index) => `${index}|${a.term}|${a.definition}`)
      .join("\n");

    const prompt = `Actúa como un experto en mnemotecnia. Analiza estas asociaciones de "${concept || ""}" y agrúpalas en categorías lógicas para facilitar su memorización.

DATOS DE ENTRADA:
${lines}

REQUISITOS:
- Devuelve un array JSON.
- Estructura: [{"groupName": "nombre", "indices": [0, 1, ...]}]`;

    const aiResult = await aiService.callGemini(apiKey, prompt, processedCount);

    if (aiResult.error) {
      const status = aiResult.status === 429 ? 503 : 502;
      return res.status(status).json({ error: aiResult.error });
    }

    const groups = aiResult.result;

    await metaRef.update({
      aiUsedToday: aiUsedToday + 1,
      aiDateKey: today,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await globalRef.set({ dateKey: today, aiCalls: globalCalls + 1 }, { merge: true });

    res.json(groups);
  } catch (error) {
    console.error("[AI] Gemini call failed:", error.message);
    if (error.code === "RATE_LIMITED") {
      return res.status(503).json({
        error: "El servicio de IA está temporalmente saturado. Intenta en unos minutos.",
      });
    }
    return res.status(502).json({ error: "Error al procesar la lista con IA." });
  }
});

exports.synthesizeSpeech = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "256MiB" },
  async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text, voiceId, rate, pitch } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Se requiere texto para sintetizar.' });
    }
    if (!voiceId || typeof voiceId !== 'string') {
      return res.status(400).json({ error: 'Se requiere voiceId para sintetizar.' });
    }

    let uid;
    try {
      const token = await getAuth().verifyIdToken(authHeader.slice(7));
      uid = token.uid;
    } catch (error) {
      console.error('[synthesizeSpeech] token verification failed:', error.message);
      return res.status(401).json({ error: 'Unauthorized', reason: error.message });
    }

    const charCount = text.length;

    try {
      await chirpTtsService.checkAndIncrementQuota(getDb(), uid, charCount);
      const audioContent = await chirpTtsService.callGoogleTts(text, voiceId, rate, pitch);
      res.json({ audioContent });
    } catch (error) {
      console.error('[synthesizeSpeech] failed:', error.message);
      if (error.code === 'GLOBAL_QUOTA_EXCEEDED' || error.code === 'USER_QUOTA_EXCEEDED') {
        return res.status(429).json({ error: error.message });
      }
      if (error.code === 'RATE_LIMITED') {
        return res.status(503).json({ error: 'El servicio de TTS está temporalmente saturado. Intenta en unos minutos.' });
      }
      return res.status(502).json({ error: 'Error al sintetizar la voz.' });
    }
  }
);

exports.listTtsVoices = onRequest(
  { cors: true, timeoutSeconds: 30, memory: "256MiB" },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    res.set('Access-Control-Allow-Origin', '*');

    try {
      const voices = await chirpVoicesService.getChirpVoices();
      console.log(`[listTtsVoices] returning ${voices.length} voices`);
      res.json({ voices });
    } catch (error) {
      console.error("[listTtsVoices] failed:", error.message);
      res.status(502).json({
        error: "Error al obtener las voces de TTS.",
        reason: error.message,
        code: error.code || null,
      });
    }
  }
);
