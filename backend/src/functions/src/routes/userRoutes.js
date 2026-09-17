const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const { QuotaExceededError } = require("../utils/helpers");
const userService = require("../services/userService");
const adminService = require("../services/adminService");
const { GetQuotaSchema } = require("../utils/validation");
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

exports.getQuota = onRequest({ cors: true }, applyRateLimit("default", async (req, res) => {
  const body = runValidation(req, res, GetQuotaSchema);
  if (!body) return;

  const { userId } = body;

  const uid = await requireAuth(req, res, userId);
  if (!uid) return;

  try {
    const data = await userService.getQuota(getDb(), userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

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

exports.deleteUserAccount = onRequest({ cors: true }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let uid;
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = token.uid;
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized", reason: error.message });
  }

  const db = getDb();

  try {
    await deleteUserData(db, uid);
    await getAuth().deleteUser(uid);
    res.json({ success: true, message: "User account and all associated data deleted" });
  } catch (error) {
    console.error("[deleteUserAccount] failed:", error.message);
    res.status(500).json({ error: "Failed to delete user account", reason: error.message });
  }
});

exports.exportUserData = onRequest({ cors: true }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let uid;
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = token.uid;
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized", reason: error.message });
  }

  const db = getDb();

  try {
    const userData = await exportUserData(db, uid);
    res.json(userData);
  } catch (error) {
    console.error("[exportUserData] failed:", error.message);
    res.status(500).json({ error: "Failed to export user data", reason: error.message });
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

async function deleteUserData(db, uid) {
  const batch = db.batch();
  let deleteCount = 0;

  const userDoc = db.collection("users").doc(uid);
  batch.delete(userDoc);
  deleteCount++;

  const listsSnap = await db.collection("lists").where("userId", "==", uid).get();
  listsSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deleteCount++;
  });

  const metaSnap = await db.collection("users").doc(uid).collection("meta").get();
  metaSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deleteCount++;
  });

  const activitySnap = await db.collection("users").doc(uid).collection("activity").get();
  activitySnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deleteCount++;
  });

  const sessionsSnap = await db.collection("users").doc(uid).collection("sessions").get();
  sessionsSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deleteCount++;
  });

  const usageSnap = await db.collection("users").doc(uid).collection("usage").get();
  usageSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deleteCount++;
  });

  await batch.commit();
  console.log(`[deleteUserData] Deleted ${deleteCount} documents for user ${uid}`);

  const { getStorage } = require("firebase-admin/storage");
  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles({ prefix: `audio/${uid}/` });
  if (files.length > 0) {
    await bucket.deleteFiles(files);
    console.log(`[deleteUserData] Deleted ${files.length} audio files for user ${uid}`);
  }
}

async function exportUserData(db, uid) {
  const [
    userDoc,
    listsSnap,
    metaSnap,
    activitySnap,
    sessionsSnap,
    usageSnap,
    progressSnap,
  ] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("lists").where("userId", "==", uid).get(),
    db.collection("users").doc(uid).collection("meta").get(),
    db.collection("users").doc(uid).collection("activity").get(),
    db.collection("users").doc(uid).collection("sessions").get(),
    db.collection("users").doc(uid).collection("usage").get(),
    db.collection("progress").where("userId", "==", uid).get(),
  ]);

  const userData = userDoc.exists ? userDoc.data() : {};

  return {
    exportedAt: new Date().toISOString(),
    userId: uid,
    profile: userData,
    lists: listsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    meta: metaSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    activity: activitySnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    sessions: sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    usage: usageSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    progress: progressSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}
