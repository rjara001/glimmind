const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("./src/utils/firebase");
const { requireAuth, metaRefFor, todayKey } = require("./src/utils/helpers");
const { QuotaExceededError } = require("./src/utils/helpers");
const { COLLECTION_NAME, MAX_CARDS_PER_LIST, PREMIUM_CARD_QUOTA } = require("./src/utils/constants");

const listService = require("./src/services/listService");
const progressService = require("./src/services/progressService");
const settingsService = require("./src/services/settingsService");
const activityService = require("./src/services/activityService");
const userService = require("./src/services/userService");
const adminService = require("./src/services/adminService");
const { handleTranscribeExistingAudio } = require("./src/services/transcribeExistingAudioService");
const { handleTranscribeSpeech } = require("./src/services/transcribeSpeechService");
const { handleSynthesizeSpeech } = require("./src/services/synthesizeSpeechService");
const { handleListTtsVoices } = require("./src/services/listTtsVoicesService");
const { handleAiGroup } = require("./src/services/aiGroupService");

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

exports.aiGroup = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 900, memory: "512MiB" }, handleAiGroup);

exports.synthesizeSpeech = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "256MiB" },
  handleSynthesizeSpeech
);

exports.listTtsVoices = onRequest(
  { cors: true, timeoutSeconds: 30, memory: "256MiB" },
  handleListTtsVoices
);

exports.transcribeSpeech = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "256MiB" },
  handleTranscribeSpeech
);

exports.transcribeExistingAudio = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "256MiB" },
  handleTranscribeExistingAudio
);
