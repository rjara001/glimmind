const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const settingsService = require("../services/settingsService");
const { GetQuotaSchema, UpdateSettingsSchema } = require("../utils/validation");
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

exports.getSettings = onRequest({ cors: true }, applyRateLimit("default", async (req, res) => {
  const body = await runValidation(req, res, GetQuotaSchema);
  if (!body) return;

  const { userId } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await settingsService.loadUserSettings(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

exports.updateSettings = onRequest({ cors: true }, applyRateLimit("updateSettings", async (req, res) => {
  const body = await runValidation(req, res, UpdateSettingsSchema);
  if (!body) return;

  const { userId, settings } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await settingsService.persistUserSettings(getDb(), userId, settings);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));