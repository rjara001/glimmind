const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const activityService = require("../services/activityService");
const { GetQuotaSchema, AppendActivitySchema, GetActivitySchema, SaveSessionSchema, GetSessionsSchema } = require("../utils/validation");
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

exports.appendActivity = onRequest({ cors: true }, applyRateLimit("appendActivity", async (req, res) => {
  const body = await runValidation(req, res, AppendActivitySchema);
  if (!body) return;

  const { userId, events } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await activityService.appendActivity(getDb(), userId, events);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

exports.getActivity = onRequest({ cors: true }, applyRateLimit("default", async (req, res) => {
  const body = await runValidation(req, res, GetActivitySchema);
  if (!body) return;

  const { userId, cursor, limit, type, listId } = body;

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
}));

exports.saveSession = onRequest({ cors: true }, applyRateLimit("default", async (req, res) => {
  const body = await runValidation(req, res, SaveSessionSchema);
  if (!body) return;

  const { userId, session } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await activityService.saveSession(getDb(), userId, session);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

exports.getSessions = onRequest({ cors: true }, applyRateLimit("default", async (req, res) => {
  const body = await runValidation(req, res, GetSessionsSchema);
  if (!body) return;

  const { userId } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await activityService.getSessions(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));