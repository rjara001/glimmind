const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth, FieldValue } = require("../utils/firebase");
const { metaRefFor, todayKey } = require("../utils/helpers");
const { YouTubeTranscriptProvider } = require("../services/transcriptProvider");
const { extractVocabulary } = require("../services/vocabularyExtractionService");
const {
  extractVideoId,
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

// Bump when extraction logic changes so stale cached results are ignored.
const NLP_CACHE_VERSION = 4;
const ALLOWED_LEVELS = new Set(["b1", "b2c1"]);

const TRANSCRIPT_LANGUAGE_LABELS = {
  en: "inglés",
  es: "español",
  de: "alemán",
  fr: "francés",
  it: "italiano",
  pt: "portugués",
  "pt-BR": "portugués",
  nl: "neerlandés",
  pl: "polaco",
  ru: "ruso",
  ja: "japonés",
  ko: "coreano",
  "zh-Hans": "chino",
  "zh-Hant": "chino",
  ar: "árabe",
  hi: "hindi",
  id: "indonesio",
  tr: "turco",
  sv: "sueco",
};

function formatTranscriptLanguages(languageCodes) {
  return languageCodes
    .map((code) => TRANSCRIPT_LANGUAGE_LABELS[code] || code)
    .reduce((acc, label) => (acc.includes(label) ? acc : [...acc, label]), [])
    .join(", ");
}

async function getCachedResult(db, cacheKey) {
  try {
    const doc = await db.collection('youtubeVocabularyCache').doc(cacheKey).get();
    if (doc.exists) {
      const data = doc.data();
      if (data.expiresAt && data.expiresAt.toMillis && data.expiresAt.toMillis() > Date.now()) {
        return data.result;
      }
    }
  } catch (error) {
    console.error('[createYouTubeDeck] cache read failed:', error.message);
  }
  return null;
}

async function setCachedResult(db, cacheKey, result, ttlMs = 24 * 60 * 60 * 1000) {
  try {
    await db.collection('youtubeVocabularyCache').doc(cacheKey).set({
      result,
      expiresAt: new Date(Date.now() + ttlMs),
      createdAt: new Date()
    });
  } catch (error) {
    console.error('[createYouTubeDeck] cache write failed:', error.message);
  }
}

exports.createYouTubeDeck = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 300, memory: "512MiB" }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let uid;
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = token.uid;
  } catch (error) {
    console.error('[createYouTubeDeck] token verification failed:', error.message);
    return res.status(401).json({ error: "Unauthorized", reason: error.message });
  }

  const { url, maxTerms = 40, targetLanguage = 'es', level = 'b1' } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "Se requiere una URL de YouTube." });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: "URL de YouTube no válida." });
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
  const ytAiDailyLimit = meta.tier === 'premium' ? YT_AI_DAILY_LIMIT_PREMIUM : YT_AI_DAILY_LIMIT_FREE;
  const usedToday = meta.ytAiDateKey === today ? (meta.ytAiUsedToday || 0) : 0;
  const quotaInfo = buildQuotaInfo(usedToday, ytAiDailyLimit);

  const cacheKey = `${NLP_CACHE_VERSION}_${videoId}_en_${maxTerms}_${targetLanguage}_${level}`;
  const cached = await getCachedResult(db, cacheKey);
  if (cached) {
    return res.json({ ...cached, quota: quotaInfo });
  }

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

  const transcriptResult = await YouTubeTranscriptProvider.getTranscript({ url, videoId });

  console.log('[createYouTubeDeck] transcriptResult=', JSON.stringify({
    hasResult: !!transcriptResult,
    segmentCount: transcriptResult?.segments?.length || 0,
    language: transcriptResult?.language
  }));

  if (!transcriptResult || transcriptResult.segments.length === 0) {
    if (transcriptResult?.blocked) {
      return res.status(503).json({
        error: "SUBTITLES_UNAVAILABLE",
        code: "503_LOGIN_REQUIRED",
        message: "YouTube restringió la extracción automática para este vídeo. Utiliza la opción manual para pegar la transcripción.",
        fallbackAvailable: true,
      });
    }
    if (transcriptResult?.otherLanguages?.length > 0) {
      return res.status(422).json({
        error: "SUBTITLES_UNAVAILABLE",
        code: "OTHER_LANGUAGES",
        message: `Este video tiene subtítulos en ${formatTranscriptLanguages(transcriptResult.otherLanguages)}, pero ninguno en inglés. Para crear un mazo necesitamos un video con subtítulos en inglés.`,
        fallbackAvailable: true,
      });
    }
    return res.status(422).json({
      error: "SUBTITLES_UNAVAILABLE",
      code: "NO_CAPTIONS",
      message: "No se pudo obtener la transcripción del video. El video no tiene subtítulos disponibles. Usa la opción manual para pegar la transcripción.",
      fallbackAvailable: true,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "El servicio de IA no está configurado." });
  }

  let vocabularyResult;
  try {
    vocabularyResult = await extractVocabulary({
      apiKey,
      segments: transcriptResult.segments,
      maxTerms,
      targetLanguage,
      level,
    });
  } catch (error) {
    console.error('[createYouTubeDeck] vocabulary extraction failed:', error.message);
    const mapped = mapGeminiError(error);
    return res.status(mapped.status).json({ error: mapped.error, ...(mapped.detail ? { detail: mapped.detail } : {}) });
  }

  if (vocabularyResult.items.length === 0) {
    return res.status(502).json({ error: "No se pudieron extraer términos del video. Inténtalo de nuevo o elige un tamaño de baraja menor." });
  }

  const rawSourceText = transcriptResult.segments.map((s) => String(s.text || "")).join(" ");

  const responseBody = {
    video: {
      id: videoId,
      title: `YouTube Video ${videoId}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    },
    source: 'youtube_auto',
    sourceType: 'youtube_auto',
    sourceUrl: url,
    rawSourceText,
    items: vocabularyResult.items,
    wasTruncated: vocabularyResult.wasTruncated,
  };

  if (vocabularyResult.items.length > 0) {
    await setCachedResult(db, cacheKey, responseBody);
  }

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