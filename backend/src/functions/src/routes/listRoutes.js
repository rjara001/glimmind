const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const { QuotaExceededError } = require("../utils/helpers");
const { COLLECTION_NAME, MAX_CARDS_PER_LIST } = require("../utils/constants");
const listService = require("../services/listService");
const { GetListsSchema, CreateListSchema, UpdateListSchema, DeleteListSchema, SplitListSchema, GetListSchema } = require("../utils/validation");
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

exports.getLists = onRequest({ cors: true }, applyRateLimit("getLists", async (req, res) => {
  const body = await runValidation(req, res, GetListsSchema);
  if (!body) return;

  const { userId } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await listService.fetchAllListsForUser(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

exports.createList = onRequest({ cors: true }, applyRateLimit("createList", async (req, res) => {
  const body = await runValidation(req, res, CreateListSchema);
  if (!body) return;

  const { name, concept, associations, settings, userId, sourceType, sourceUrl, rawSourceText, sourceRow } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const id = await listService.persistNewListWithAssociations(getDb(), userId, {
      name,
      concept,
      associations,
      settings,
      sourceType,
      sourceUrl,
      rawSourceText,
      sourceRow,
    });
    res.json(id);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}));

exports.updateList = onRequest({ cors: true }, applyRateLimit("updateList", async (req, res) => {
  const body = await runValidation(req, res, UpdateListSchema);
  if (!body) return;

  const { listId, ...updates } = body;

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const data = await listService.applyUpdatesToListAndAdjustCardCounters(getDb(), listId, uid, updates);
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
}));

exports.deleteList = onRequest({ cors: true }, applyRateLimit("deleteList", async (req, res) => {
  const body = await runValidation(req, res, DeleteListSchema);
  if (!body) return;

  const { listId } = body;

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const data = await listService.removeListAndDecrementUserCardCount(getDb(), listId, uid);
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
}));

exports.splitList = onRequest({ cors: true }, applyRateLimit("splitList", async (req, res) => {
  console.log('=== splitList LLAMADO ===');
  console.log('body:', JSON.stringify(req.body).slice(0, 500));

  const body = await runValidation(req, res, SplitListSchema);
  if (!body) return;

  const { listId, groups } = body;

  const uid = await requireAuth(req, res);
  if (!uid) {
    console.log('=== splitList ERROR: no uid ===');
    return;
  }

  console.log('=== splitList: uid =', uid, 'listId =', listId, 'groups =', groups.length);

  try {
    const data = await listService.divideOriginalListIntoGroupsAndReplaceIt(getDb(), listId, uid, groups);
    console.log('=== splitList ÉXITO ===');
    console.log('ids:', data.ids);
    res.json(data);
  } catch (error) {
    console.log('=== splitList ERROR CATCH ===');
    console.log('error.message:', error.message);
    console.log('error.stack:', error.stack);

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
}));

exports.getList = onRequest({ cors: true }, applyRateLimit("getList", async (req, res) => {
  const body = await runValidation(req, res, GetListSchema);
  if (!body) return;

  const { listId } = body;

  const uid = await requireAuth(req, res);
  if (!uid) return;

  try {
    const data = await listService.fetchListByIdForUser(getDb(), listId, uid);
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
}));