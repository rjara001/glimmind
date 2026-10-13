const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { metaRefFor, todayKey } = require("../utils/helpers");
const { extractVocabulary } = require("../services/vocabularyExtractionService");
const { runAiDeckWithQuota } = require("../services/aiDeckQuota");
const { applyRateLimit } = require("../utils/rateLimit");
const {
  extractVideoId,
  fetchYouTubeVideoTitle,
  resolveTier,
  isValidTargetLanguage,
  mapGeminiError,
} = require("../utils/vocabularyHelpers");
const {
  DECK_TIERS,
} = require("../utils/constants");

const ALLOWED_LEVELS = new Set(["b1", "b2c1"]);
const MAX_MANUAL_TEXT_LENGTH = 200000;

async function handleCreateDeckFromText(req, res) {
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "El servicio de IA no está configurado." });
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

  // Reserved inside one transaction before Gemini is called, and refunded if it
  // throws. Concurrent requests can no longer each pass the check against the
  // same starting figure.
  try {
    const outcome = await runAiDeckWithQuota(db, metaRef, today, tier.costPercent, async () => {
      const vocabularyResult = await extractVocabulary({
        apiKey,
        segments: [{ text: text.trim(), start: 0, duration: 0 }],
        maxTerms,
        targetLanguage,
        level,
      });

      if (vocabularyResult.items.length === 0) {
        const emptyError = new Error("No se pudieron extraer términos del texto.");
        emptyError.code = "NO_ITEMS";
        throw emptyError;
      }

      return {
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
    });
    res.json({ ...outcome.result, quota: outcome.quota });
  } catch (error) {
    console.error('[createDeckFromText] failed:', error.message);

    if (error.code === 'AI_QUOTA_EXCEEDED' || error.code === 'AI_GLOBAL_CAP_REACHED') {
      return res.status(429).json({ error: error.message, quota: error.quota || undefined });
    }

    if (error.code === 'NO_ITEMS') {
      return res.status(502).json({
        error: "No se pudieron extraer términos del texto. Revisa la transcripción e inténtalo de nuevo.",
      });
    }

    const mapped = mapGeminiError(error);
    return res.status(mapped.status).json({ error: mapped.error, ...(mapped.detail ? { detail: mapped.detail } : {}) });
  }
}

exports.createDeckFromText = onRequest(
  { cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 300, memory: "512MiB" },
  applyRateLimit("aiGroup", handleCreateDeckFromText)
);
