const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const { QuotaExceededError } = require("../utils/helpers");
const userService = require("../services/userService");
const adminService = require("../services/adminService");
const {
  TRANSLATION_GLOBAL_MONTHLY_CHARS,
  TRANSLATION_USER_MONTHLY_CHARS,
  TRANSLATION_PREMIUM_USER_MONTHLY_CHARS,
  CHIRP_TTS_GLOBAL_LIMIT,
  CHIRP_TTS_USER_LIMIT,
  CHIRP_TTS_PREMIUM_USER_LIMIT,
  CHIPTT_STT_GLOBAL_LIMIT,
  CHIPTT_STT_USER_LIMIT,
  CHIPTT_STT_PREMIUM_USER_LIMIT,
  GLOBAL_AI_DAILY_CAP,
} = require("../utils/constants");
const { QuotaService } = require("../services/quotaService");

exports.getQuota = onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await userService.getQuota(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.setUserQuota = onRequest({ cors: true, secrets: ["ADMIN_UIDS"] }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { uid, tier } = req.body;
  if (!uid || (tier !== "free" && tier !== "premium")) {
    return res.status(400).json({ error: "uid and tier (free|premium) are required" });
  }

  try {
    const decoded = await adminService.verifyAdmin(authHeader.slice(7));
    const data = await userService.setUserQuota(getDb(), decoded.uid, uid, tier);
    res.json(data);
  } catch (error) {
    if (error.message === "Forbidden") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

exports.setUserPremium = onRequest({ cors: true }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    const uid = token.uid;
    const email = token.email;
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

    if (!isEmulator && email !== "rjara001@gmail.com") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const data = await userService.setUserPremium(getDb(), uid);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const ADMIN_EMAILS = ["rjara001@gmail.com", "peptio@gmail.com"];

exports.getAdminUsage = onRequest({ cors: true }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let callerEmail;
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    callerEmail = decoded.email;
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { month } = req.body || {};
  const monthKey = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const db = getDb();

  try {
    const [translationResult, ttsResult, sttResult, aiResult, usersList] = await Promise.all([
      queryTranslationUsage(db, monthKey),
      queryTtsUsage(db, monthKey),
      querySttUsage(db, monthKey),
      queryAiUsage(db),
      listAllUsers(),
    ]);

    const enrichedUsers = await enrichUsersWithUsage(db, usersList, monthKey);

    res.json({
      month: monthKey,
      translation: translationResult,
      tts: ttsResult,
      stt: sttResult,
      ai: aiResult,
      users: enrichedUsers,
    });
  } catch (error) {
    console.error("[getAdminUsage] failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

async function queryTranslationUsage(db, monthKey) {
  const globalRef = db.collection("usage_stats").doc(`translation_global_${monthKey}`);
  const globalSnap = await globalRef.get();
  const data = globalSnap.exists ? globalSnap.data() : {};

  return {
    global: {
      used: data.totalCharactersTranslated || 0,
      calls: data.totalCalls || 0,
      limit: TRANSLATION_GLOBAL_MONTHLY_CHARS,
    },
  };
}

async function queryTtsUsage(db, monthKey) {
  const globalRef = db.collection("usage").doc("chirpTts").collection("global").doc(monthKey);
  const globalSnap = await globalRef.get();
  const data = globalSnap.exists ? globalSnap.data() : {};

  return {
    global: {
      used: data.charsUsed || 0,
      calls: data.totalCalls || 0,
      limit: CHIRP_TTS_GLOBAL_LIMIT,
    },
  };
}

async function querySttUsage(db, monthKey) {
  const globalRef = db.collection("usage").doc("chipttStt").collection("global").doc(monthKey);
  const globalSnap = await globalRef.get();
  const data = globalSnap.exists ? globalSnap.data() : {};

  return {
    global: {
      used: data.audioSecondsUsed || 0,
      calls: data.totalCalls || 0,
      limit: CHIPTT_STT_GLOBAL_LIMIT,
    },
  };
}

async function queryAiUsage(db) {
  const globalRef = db.collection("usage").doc("global");
  const globalSnap = await globalRef.get();
  const data = globalSnap.exists ? globalSnap.data() : {};

  return {
    global: {
      used: data.aiCalls || 0,
      calls: data.aiCalls || 0,
      limit: GLOBAL_AI_DAILY_CAP,
    },
  };
}

async function listAllUsers() {
  const auth = getAuth();
  const listResult = await auth.listUsers(1000);
  return listResult.users.map((u) => ({
    uid: u.uid,
    email: u.email || "unknown",
  }));
}

async function enrichUsersWithUsage(db, users, monthKey) {
  const results = [];

  for (const user of users) {
    const metaRef = db.collection("users").doc(user.uid).collection("meta").doc("main");
    const metaSnap = await metaRef.get();
    const meta = metaSnap.exists ? metaSnap.data() : {};
    const tier = meta.tier || "free";

    const [translationSnap, ttsSnap, sttSnap] = await Promise.all([
      db.collection("users").doc(user.uid).collection("usage").doc(`translation_${monthKey}`).get(),
      db.collection("usage").doc("chirpTts").collection("users").doc(user.uid).collection("months").doc(monthKey).get(),
      db.collection("usage").doc("chipttStt").collection("users").doc(user.uid).collection("months").doc(monthKey).get(),
    ]);

    const translationData = translationSnap.exists ? translationSnap.data() : {};
    const ttsData = ttsSnap.exists ? ttsSnap.data() : {};
    const sttData = sttSnap.exists ? sttSnap.data() : {};

    results.push({
      email: user.email,
      uid: user.uid,
      tier,
      translation: {
        used: translationData.charactersTranslated || 0,
        calls: translationData.callCount || 0,
        limit: tier === "premium" ? TRANSLATION_PREMIUM_USER_MONTHLY_CHARS : TRANSLATION_USER_MONTHLY_CHARS,
      },
      tts: {
        used: ttsData.charsUsed || 0,
        calls: ttsData.callCount || 0,
        limit: tier === "premium" ? CHIRP_TTS_PREMIUM_USER_LIMIT : CHIRP_TTS_USER_LIMIT,
      },
      stt: {
        used: sttData.audioSecondsUsed || 0,
        calls: sttData.callCount || 0,
        limit: tier === "premium" ? CHIPTT_STT_PREMIUM_USER_LIMIT : CHIPTT_STT_USER_LIMIT,
      },
      ai: {
        used: meta.aiUsedToday || 0,
        calls: meta.aiUsedToday || 0,
        limit: QuotaService.getAiDailyLimit(tier),
      },
    });
  }

  return results;
}
