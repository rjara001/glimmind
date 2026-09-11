const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const { QuotaExceededError } = require("../utils/helpers");
const { COLLECTION_NAME, MAX_CARDS_PER_LIST } = require("../utils/constants");
const listService = require("../services/listService");

exports.getLists = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await listService.fetchAllListsForUser(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.createList = onRequest({ cors: true }, async (req, res) => {
  const { name, concept, associations, settings, userId, sourceType, sourceUrl, rawSourceText, sourceRow } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

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
});

exports.updateList = onRequest({ cors: true }, async (req, res) => {
  const { listId, ...updates } = req.body;

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
});

exports.deleteList = onRequest({ cors: true }, async (req, res) => {
  const { listId } = req.body;

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
});
exports.splitList = onRequest({ cors: true }, async (req, res) => {
  console.log('=== splitList LLAMADO ===');
  console.log('body:', JSON.stringify(req.body).slice(0, 500));

  const { listId, groups } = req.body;
  if (!listId || !Array.isArray(groups) || groups.length === 0) {
    console.log('=== splitList ERROR: listId o groups inválidos ===');
    console.log('listId:', listId);
    console.log('groups:', Array.isArray(groups) ? groups.length : typeof groups);
    return res.status(400).json({ error: "listId and groups are required" });
  }

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
});

exports.getList = onRequest({ cors: true }, async (req, res) => {
  const { listId } = req.body;

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
});
