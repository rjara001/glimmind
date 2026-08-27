class QuotaExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function metaRefFor(db, userId) {
  return db.collection("users").doc(userId).collection("meta").doc("main");
}

function metaDefaults() {
  const { DEFAULT_CARD_QUOTA, DEFAULT_AI_DAILY_QUOTA } = require("./constants");
  return {
    tier: "free",
    cardQuota: DEFAULT_CARD_QUOTA,
    cardCount: 0,
    aiQuotaDaily: DEFAULT_AI_DAILY_QUOTA,
    aiUsedToday: 0,
    aiDateKey: todayKey(),
    ytAiUsedToday: 0,
    ytAiDateKey: todayKey(),
    updatedAt: require("./firebase").FieldValue.serverTimestamp(),
  };
}

async function getOrCreateMeta(db, userId) {
  const { DEFAULT_CARD_QUOTA, DEFAULT_AI_DAILY_QUOTA } = require("./constants");
  const { FieldValue } = require("./firebase");
  const metaRef = metaRefFor(db, userId);
  const snap = await metaRef.get();
  if (snap.exists) {
    return { ref: metaRef, data: snap.data() };
  }
  const listsSnap = await db.collection("lists").where("userId", "==", userId).get();
  const cardCount = listsSnap.docs.reduce((sum, doc) => {
    const associations = doc.data().associations;
    return sum + (Array.isArray(associations) ? associations.length : 0);
  }, 0);
  const data = {
    tier: "free",
    cardQuota: DEFAULT_CARD_QUOTA,
    cardCount,
    aiQuotaDaily: DEFAULT_AI_DAILY_QUOTA,
    aiUsedToday: 0,
    aiDateKey: todayKey(),
    ytAiUsedToday: 0,
    ytAiDateKey: todayKey(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await metaRef.set(data);
  return { ref: metaRef, data };
}

function toMillis(value) {
  return value && typeof value.toMillis === "function" ? value.toMillis() : value;
}

async function requireAuth(req, res, expectedUserId) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error(`[auth] missing bearer header (path=${req.path})`);
    res.status(401).json({ error: "Unauthorized", authHeaderPresent: !!authHeader, authPrefix: authHeader ? authHeader.split(" ")[0] : null });
    return null;
  }
  try {
    const token = await require("./firebase").getAuth().verifyIdToken(authHeader.slice(7));
    if (expectedUserId && token.uid !== expectedUserId) {
      console.error(`[auth] uid mismatch (path=${req.path}, expected=${expectedUserId}, got=${token.uid})`);
      res.status(403).json({ error: "Forbidden" });
      return null;
    }
    return token.uid;
  } catch (error) {
    console.error(`[auth] token verification failed (path=${req.path}): ${error.message}`);
    res.status(401).json({ error: "Unauthorized", reason: error.message });
    return null;
  }
}

async function requireAuthForUser(req, res, expectedUserId) {
  const uid = await requireAuth(req, res);
  if (!uid) return null;
  if (expectedUserId && uid !== expectedUserId) {
    console.error(`[auth] uid mismatch (path=${req.path}, expected=${expectedUserId}, got=${uid})`);
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return uid;
}

module.exports = {
  QuotaExceededError,
  todayKey,
  metaRefFor,
  metaDefaults,
  getOrCreateMeta,
  toMillis,
  requireAuth,
};
