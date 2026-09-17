const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const { rateLimit } = require("../utils/rateLimit");
const listService = require("../services/listService");
const progressService = require("../services/progressService");
const settingsService = require("../services/settingsService");
const userService = require("../services/userService");

const GetDashboardDataSchema = require("../utils/validation").GetDashboardDataSchema;

function runValidation(req, res, schema) {
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

exports.getDashboardData = onRequest(
  { cors: true },
  applyRateLimit("default", async (req, res) => {
    const body = runValidation(req, res, GetDashboardDataSchema);
    if (!body) return;

    const { userId } = body;

    const uid = await requireAuth(req, res, userId);
    if (!uid) return;

    const db = getDb();

    const [lists, progress, quota, settings] = await Promise.allSettled([
      listService.fetchAllListsForUser(db, uid),
      progressService.loadUserLearningProgress(db, uid),
      userService.getQuota(db, uid),
      settingsService.loadUserSettings(db, uid),
    ]);

    res.json({
      lists: lists.status === "fulfilled" ? lists.value : [],
      progress: progress.status === "fulfilled" ? progress.value : null,
      quota: quota.status === "fulfilled" ? quota.value : null,
      settings: settings.status === "fulfilled" ? settings.value : null,
      errors: {
        progress: progress.status === "rejected" ? String(progress.reason) : undefined,
        quota: quota.status === "rejected" ? String(quota.reason) : undefined,
        settings: settings.status === "rejected" ? String(settings.reason) : undefined,
      },
    });
  })
);
