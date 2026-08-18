const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const settingsService = require("../services/settingsService");

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
