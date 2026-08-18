const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const progressService = require("../services/progressService");

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
