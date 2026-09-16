const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const progressService = require("../services/progressService");
const { validate, GetQuotaSchema, UpdateProgressSchema } = require("../utils/validation");
const { rateLimit } = require("../utils/rateLimit");

function applyRateLimit(fnName, handler) {
  const limiter = rateLimit(fnName);
  return async (req, res) => {
    await new Promise((resolve, reject) => {
      limiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return handler(req, res);
  };
}

async function runValidation(req, res, schema) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten();
    res.status(400).json({
      error: "Invalid request body",
      details: errors.fieldErrors,
    });
    return null;
  }
  req.validatedBody = result.data;
  return req.validatedBody;
}

exports.getProgress = onRequest({ cors: true }, applyRateLimit("default", async (req, res) => {
  const body = await runValidation(req, res, GetQuotaSchema);
  if (!body) return;

  const { userId } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await progressService.loadUserLearningProgress(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

exports.updateProgress = onRequest({ cors: true }, applyRateLimit("updateProgress", async (req, res) => {
  const body = await runValidation(req, res, UpdateProgressSchema);
  if (!body) return;

  const { userId, progress } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await progressService.persistUserLearningProgress(getDb(), userId, progress);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));