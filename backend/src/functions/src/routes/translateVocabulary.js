const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { sendAuthenticatedRequest } = require("../utils/googleApiClient");
const {
  GCP_PROJECT_ID,
  GOOGLE_TRANSLATE_URL,
} = require("../utils/constants");
const { runMeteredCall } = require("../utils/meteredQuota");
const {
  resolveCurrentMonthKey,
  buildTranslationQuotaSpec,
  userTranslationLimit,
} = require("../services/translationQuota");

exports.translateVocabulary = onRequest({ cors: true, timeoutSeconds: 120, memory: "512MiB" }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let uid;
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch (error) {
    console.error("[translateVocabulary] token verification failed:", error.message);
    return res.status(401).json({ error: "Unauthorized", reason: error.message });
  }

  const { userId, cards, texts, targetLang = "es", sourceLang = "en" } = req.body || {};
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId is required" });
  }

  if (userId !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const translationCards = normalizeCards(cards, texts);
  if (translationCards.length === 0) {
    return res.status(400).json({ error: "Se requiere un array de textos para traducir." });
  }
  if (!targetLang || typeof targetLang !== "string") {
    return res.status(400).json({ error: "Se requiere targetLang válido." });
  }

  const incomingCharCount = translationCards.reduce((sum, c) => sum + c.term.length, 0);
  const db = getDb();
  const monthKey = resolveCurrentMonthKey();
  const spec = buildTranslationQuotaSpec(db, uid, monthKey, incomingCharCount);

  let userUsedChars = 0;
  let userLimitChars = 0;

  try {
    // Reserved before the call and refunded if it throws, so concurrent batches
    // can no longer each pass the check against the same starting figure.
    const translations = await runMeteredCall(
      db,
      spec,
      () => translateCards(translationCards, targetLang, sourceLang),
      (committed, tierData) => {
        // The committed figure is what was actually charged, not a stale
        // pre-call read, so what is reported back matches the reservation.
        userUsedChars = committed.userChars;
        userLimitChars = userTranslationLimit(tierData);
      }
    );

    res.json({
      translations: translationCards.map((card, idx) => ({
        original: card.term,
        translated: translations[idx] || card.term,
      })),
      consumedChars: incomingCharCount,
      userRemainingChars: Math.max(0, userLimitChars - userUsedChars),
      quotaExceeded: false,
    });
  } catch (error) {
    console.error("[translateVocabulary] failed:", error.message);

    if (error.code === "TRANSLATION_GLOBAL_QUOTA_EXCEEDED") {
      return res.status(429).json({
        error: error.message,
        quotaExceeded: true,
        scope: "global",
        consumedChars: 0,
        userRemainingChars: 0,
      });
    }

    if (error.code === "TRANSLATION_USER_QUOTA_EXCEEDED") {
      // error.limit comes from the reservation, which resolves it from the
      // caller's tier. This path used to report the free limit for everyone.
      return res.status(429).json({
        error: error.message,
        quotaExceeded: true,
        scope: "user",
        consumedChars: 0,
        userRemainingChars: Math.max(0, error.limit - error.used),
      });
    }

    return res.status(502).json({ error: "Error al traducir el texto." });
  }
});

function normalizeCards(cards, texts) {
  if (Array.isArray(cards) && cards.length > 0) {
    return cards.map((c) => ({
      term: typeof c === "string" ? c : String(c.term || ""),
      context: typeof c === "object" ? c.context || "" : "",
    })).filter((c) => c.term.length > 0);
  }
  if (Array.isArray(texts) && texts.length > 0) {
    return texts.map((t) => ({ term: String(t), context: "" }));
  }
  return [];
}

// Google Cloud Translation v3 is the only translation engine. DeepL was the
// primary until 2026-10-11 and was removed: it never produced a translation in
// production, its free tier (500k chars/mo) is identical to Google's and is
// closed to new signups, and maintaining two engines for one allowance is not
// justified. See docs/BUSINESS_MODEL.md.
async function translateCards(cards, targetLang, sourceLang = "en") {
  return translateWithGoogle(cards, targetLang, sourceLang);
}

async function translateWithGoogle(cards, targetLang, sourceLang = "en") {
  const contents = cards.map((card) => card.term);

  const response = await sendAuthenticatedRequest(
    GOOGLE_TRANSLATE_URL,
    {
      contents,
      mimeType: "text/plain",
      targetLanguageCode: targetLang,
      sourceLanguageCode: sourceLang,
    },
    60000
  );

  if (!response.translations || response.translations.length !== cards.length) {
    throw new Error("Google Translate returned invalid number of translations");
  }

  return response.translations.map((t) => t.translatedText);
}
