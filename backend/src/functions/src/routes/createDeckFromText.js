const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth, FieldValue } = require("../utils/firebase");
const { metaRefFor, todayKey } = require("../utils/helpers");
const { extractVocabulary } = require("../services/vocabularyExtractionService");
const { QuotaService } = require("../services/quotaService");
const {
  extractVideoId,
  fetchYouTubeVideoTitle,
  resolveTier,
  buildQuotaInfo,
  isValidTargetLanguage,
  mapGeminiError,
} = require("../utils/vocabularyHelpers");
const {
  DECK_TIERS,
  YT_AI_DAILY_LIMIT_FREE,
  YT_AI_DAILY_LIMIT_PREMIUM,
  GLOBAL_AI_DAILY_CAP,
} = require("../utils/constants");

const ALLOWED_LEVELS = new Set(["b1", "b2c1"]);
const MAX_MANUAL_TEXT_LENGTH = 200000;

exports.createDeckFromText = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 300, memory: "512MiB" }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let uid;
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = token.uid;
  } catch (error) {
    console.error('[createDeckFromText] token verification failed:', error.message);
    return res.status(401).json({ error: "Unauthorized", reason: error.message });
  }

  const { text, videoUrl, maxTerms = 40, targetLanguage = 'es', level = 'b1' } = req.body || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: "Se requiere el texto de la transcripción." });
  }
  if (text.length > MAX_MANUAL_TEXT_LENGTH) {
    return res.status(400).json({ error: `El texto de la transcripción es demasiado largo (máximo ${MAX_MANUAL_TEXT_LENGTH} caracteres).` });
  }
  if (videoUrl != null && typeof videoUrl !== 'string') {
    return res.status(400).json({ error: "videoUrl debe ser un string." });
  }

  const tier = resolveTier(maxTerms);
  if (!tier) {
    return res.status(400).json({
      error: `maxTerms debe ser uno de: ${Object.values(DECK_TIERS).map((t) => t.maxTerms).join(', ')}.`,
    });
  }

  if (!isValidTargetLanguage(targetLanguage)) {
    return res.status(400).json({ error: "Idioma de destino no soportado." });
  }

  if (!ALLOWED_LEVELS.has(level)) {
    return res.status(400).json({ error: "level debe ser 'b1' o 'b2c1'." });
  }

  const db = getDb();
  const today = todayKey();
  const metaRef = metaRefFor(db, uid);
  const metaSnap = await metaRef.get();
  const meta = metaSnap.exists ? metaSnap.data() : {};
  const ytAiDailyLimit = QuotaService.getAiDailyLimit(meta.tier);
  const usedToday = meta.ytAiDateKey === today ? (meta.ytAiUsedToday || 0) : 0;
  const quotaInfo = buildQuotaInfo(usedToday, ytAiDailyLimit);

  if (tier.costPercent > quotaInfo.remainingPoints) {
    return res.status(429).json({
      error: `Tu cuota diaria de IA restante (${quotaInfo.remainingPercent}%) no alcanza para este tamaño (${tier.costPercent}%). Elige un tamaño menor.`,
      quota: quotaInfo,
    });
  }

  const globalRef = db.collection("usage").doc("global");
  const globalSnap = await globalRef.get();
  const globalData = globalSnap.exists ? globalSnap.data() : { dateKey: today, aiCalls: 0 };
  const globalCalls = globalData.dateKey === today ? (globalData.aiCalls || 0) : 0;
  if (globalCalls >= GLOBAL_AI_DAILY_CAP) {
    return res.status(429).json({ error: "El servicio de IA alcanzó su límite diario. Intenta mañana." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "El servicio de IA no está configurado." });
  }

  let vocabularyResult;
  try {
    vocabularyResult = await extractVocabulary({
      apiKey,
      segments: [{ text: text.trim(), start: 0, duration: 0 }],
      maxTerms,
      targetLanguage,
      level,
    });
  } catch (error) {
    console.error('[createDeckFromText] vocabulary extraction failed:', error.message);
    const mapped = mapGeminiError(error);
    return res.status(mapped.status).json({ error: mapped.error, ...(mapped.detail ? { detail: mapped.detail } : {}) });
  }

  if (vocabularyResult.items.length === 0) {
    return res.status(502).json({ error: "No se pudieron extraer términos del texto. Revisa la transcripción e inténtalo de nuevo." });
  }

  const isManualFromUrl = typeof videoUrl === 'string' && videoUrl.trim().length > 0;
  const sourceType = isManualFromUrl ? 'youtube_manual_transcript' : 'raw_text';

  let video = null;
  let videoId = null;
  let videoTitle = null;
  if (isManualFromUrl) {
    videoId = extractVideoId(videoUrl);
    videoTitle = videoId ? await fetchYouTubeVideoTitle(videoId) : null;
    video = {
      id: videoId || 'unknown',
      title: videoTitle || `YouTube Video ${videoId || ''}`,
      url: videoUrl.trim(),
    };
  }

  const responseBody = {
    video,
    source: sourceType,
    sourceType,
    sourceUrl: isManualFromUrl ? videoUrl.trim() : undefined,
    rawSourceText: text.trim(),
    title: vocabularyResult.title,
    sourceRow: {
      sourceType,
      ...(isManualFromUrl ? { sourceUrl: videoUrl.trim() } : {}),
      ...(videoId ? { videoId } : {}),
      ...(videoTitle ? { videoTitle } : {}),
      rawSourceText: text.trim(),
    },
    items: vocabularyResult.items,
    wasTruncated: vocabularyResult.wasTruncated,
  };

  const newUsedToday = usedToday + tier.costPercent;
  await metaRef.set({
    ytAiUsedToday: newUsedToday,
    ytAiDateKey: today,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await globalRef.set({ dateKey: today, aiCalls: globalCalls + 1 }, { merge: true });

  res.json({
    ...responseBody,
    quota: buildQuotaInfo(newUsedToday, ytAiDailyLimit),
  });
});
