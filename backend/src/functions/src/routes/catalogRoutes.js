const { onRequest } = require("firebase-functions/v2/https");
const { getDb, FieldValue } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const { fetchListByIdForUser } = require("../services/listService");
const { moderateDeckContent, findDuplicateByContent } = require("../services/moderationService");
const { PUBLISH_MIN_CARDS, PUBLISH_MAX_CARDS } = require("../utils/constants");

const ALLOWED_CATEGORIES = new Set([
  "Casual",
  "Pop Culture",
  "Music",
  "Travel",
  "Work",
  "Languages",
  "Science",
  "History",
  "Art",
  "Technology",
  "Other",
]);

exports.submitDeckToCatalog = onRequest({ cors: true }, async (req, res) => {
  const uid = await requireAuth(req, res);
  if (!uid) return;

  const body = req.body || {};
  const { listId, name, category, description, tags } = body;
  if (!listId || typeof name !== "string" || !category) {
    res.status(400).json({ code: "BAD_REQUEST", detail: "Faltan campos requeridos (listId, name, category)." });
    return;
  }
  if (!ALLOWED_CATEGORIES.has(category)) {
    res.status(400).json({ code: "BAD_CATEGORY", detail: `Categoría no permitida: ${category}` });
    return;
  }

  try {
    const db = getDb();
    const list = await fetchListByIdForUser(db, listId, uid);
    const cardCount = Array.isArray(list.associations) ? list.associations.length : 0;

    if (cardCount < PUBLISH_MIN_CARDS || cardCount > PUBLISH_MAX_CARDS) {
      res.status(400).json({
        code: "OUT_OF_RANGE",
        detail: `El mazo debe tener entre ${PUBLISH_MIN_CARDS} y ${PUBLISH_MAX_CARDS} tarjetas (tiene ${cardCount}).`,
      });
      return;
    }

    const completedAt = list.history?.completedAt;
    if (!completedAt) {
      res.status(400).json({
        code: "NOT_COMPLETED",
        detail: "Debes completar el mazo al 100% al menos una vez antes de publicarlo.",
      });
      return;
    }

    const sanitizedTags = Array.isArray(tags)
      ? tags.filter((t) => typeof t === "string" && t.trim().length > 0).map((t) => t.trim()).slice(0, 12)
      : [];

    const moderation = await moderateDeckContent(list.associations, {
      name: name.trim(),
      description: typeof description === "string" ? description : "",
      tags: sanitizedTags,
    });

    if (moderation.rejected > 0) {
      res.status(422).json({
        code: "REJECTED",
        detail: "El contenido fue rechazado por la moderación.",
        moderation,
      });
      return;
    }

    const duplicate = await findDuplicateByContent(db, list.associations);
    if (duplicate) {
      res.status(409).json({
        code: "DUPLICATE",
        detail: `Ya existe un mazo global similar: "${duplicate.name}".`,
        duplicate: { id: duplicate.id, name: duplicate.name, overlap: duplicate.overlap },
      });
      return;
    }

    const targetCollection = moderation.review > 0 ? "pendingSubmissions" : "prebuiltDecks";
    const docRef = db.collection(targetCollection).doc();
    const deckDoc = {
      id: docRef.id,
      name: name.trim(),
      category,
      description: typeof description === "string" ? description : (list.concept || ""),
      icon: "📘",
      order: 999,
      active: moderation.review === 0,
      tags: sanitizedTags,
      associations: list.associations,
      publishedBy: uid,
      publishedAt: FieldValue.serverTimestamp(),
      moderation,
      sourceListId: listId,
    };
    await docRef.set(deckDoc);

    res.json({
      ok: true,
      deckId: docRef.id,
      moderation,
      collection: targetCollection,
    });
  } catch (error) {
    console.error("[submitDeckToCatalog]", error);
    res.status(500).json({ code: "INTERNAL", detail: error.message || "Internal error" });
  }
});

exports.moderateDeckPreview = onRequest({ cors: true }, async (req, res) => {
  const uid = await requireAuth(req, res);
  if (!uid) return;

  const { listId } = req.body || {};
  if (!listId) {
    res.status(400).json({ code: "BAD_REQUEST", detail: "Falta listId." });
    return;
  }

  try {
    const db = getDb();
    const list = await fetchListByIdForUser(db, listId, uid);
    const moderation = await moderateDeckContent(list.associations, {
      name: list.name,
      description: list.concept || "",
      tags: [],
    });
    res.json({ ok: true, moderation });
  } catch (error) {
    console.error("[moderateDeckPreview]", error);
    res.status(500).json({ code: "INTERNAL", detail: error.message || "Internal error" });
  }
});
