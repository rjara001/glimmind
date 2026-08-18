const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const activityService = require("../services/activityService");

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
