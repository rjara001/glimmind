const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { sendAuthenticatedRequest } = require("../utils/googleApiClient");
const {
  GCP_PROJECT_ID,
  GOOGLE_TRANSLATE_URL,
  TRANSLATION_GLOBAL_MONTHLY_CHARS,
  TRANSLATION_USER_MONTHLY_CHARS,
  TRANSLATION_PREMIUM_USER_MONTHLY_CHARS,
} = require("../utils/constants");
const {
  resolveCurrentMonthKey,
  fetchTranslationQuotaDocuments,
  assertGlobalTranslationQuotaHasCapacity,
  assertUserTranslationQuotaHasCapacity,
  persistTranslationQuotaUsage,
} = require("../services/translationQuota");
const { translateWithDeepL } = require("../services/deeplService");

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

  let quotaDocs;
  try {
    quotaDocs = await fetchTranslationQuotaDocuments(db, uid, monthKey);
  } catch (error) {
    console.error("[translateVocabulary] quota fetch failed:", error.message);
    return res.status(500).json({ error: "Error al leer cuotas de traducción." });
  }

  try {
    assertGlobalTranslationQuotaHasCapacity(quotaDocs.globalData, incomingCharCount);
    const userQuota = await assertUserTranslationQuotaHasCapacity(db, uid, quotaDocs.userData, incomingCharCount);

    const translations = await translateCards(translationCards, targetLang, sourceLang);

    await persistTranslationQuotaUsage(
      db,
      quotaDocs.globalRef,
      quotaDocs.userRef,
      quotaDocs.globalData,
      quotaDocs.userData,
      incomingCharCount,
      monthKey
    );

    const userRemainingChars = Math.max(0, userQuota.userLimit - (quotaDocs.userData.charactersTranslated || 0) - incomingCharCount);

    res.json({
      translations: translationCards.map((card, idx) => ({
        original: card.term,
        translated: translations[idx] || card.term,
      })),
      consumedChars: incomingCharCount,
      userRemainingChars,
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
      const userLimit = TRANSLATION_USER_MONTHLY_CHARS;
      const userRemainingChars = Math.max(0, userLimit - (quotaDocs.userData.charactersTranslated || 0));
      return res.status(429).json({
        error: error.message,
        quotaExceeded: true,
        scope: "user",
        consumedChars: 0,
        userRemainingChars: userRemainingChars,
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

async function translateCards(cards, targetLang, sourceLang = "en") {
  // Primary: DeepL API Free
  try {
    const deeplResult = await translateWithDeepL(cards, targetLang, sourceLang);
    if (deeplResult) {
      console.log("[translateVocabulary] translated via DeepL");
      return deeplResult;
    }
  } catch (error) {
    console.warn("[translateVocabulary] DeepL failed, falling back to Google:", error.message);
  }

  // Fallback: Google Translate v3
  console.log("[translateVocabulary] using Google Translate fallback");
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
