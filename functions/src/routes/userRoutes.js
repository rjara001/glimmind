const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const { QuotaExceededError } = require("../utils/helpers");
const userService = require("../services/userService");
const adminService = require("../services/adminService");

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
