const { DECK_TIERS, VOCABULARY_TARGET_LANGUAGES } = require("./constants");

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = String(url || "").match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchYouTubeVideoTitle(videoId) {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
      { headers: { "User-Agent": "Glimmind/1.0" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.title === "string" && data.title.trim().length > 0 ? data.title.trim() : null;
  } catch (error) {
    console.error("[fetchYouTubeVideoTitle] failed:", error.message);
    return null;
  }
}

function resolveTier(maxTerms) {
  const tierEntry = Object.values(DECK_TIERS).find((tier) => tier.maxTerms === maxTerms);
  return tierEntry || null;
}

function buildQuotaInfo(usedPoints, limit) {
  const remainingPoints = Math.max(0, limit - usedPoints);
  const usedTodayPercent = limit > 0 ? Math.round((usedPoints / limit) * 100) : 0;
  const remainingPercent = limit > 0 ? Math.round((remainingPoints / limit) * 100) : 0;
  return {
    usedPoints,
    limit,
    remainingPoints,
    usedTodayPercent,
    remainingPercent,
  };
}

function isValidTargetLanguage(targetLanguage) {
  return VOCABULARY_TARGET_LANGUAGES.includes(targetLanguage);
}

function mapGeminiError(error) {
  if (error.code === "RATE_LIMITED") {
    return { status: 503, error: "El servicio de IA está temporalmente saturado. Intenta en unos minutos." };
  }
  if (error.code === "BILLING_ERROR") {
    return { status: 402, error: "Los créditos de IA de este proyecto se han agotado. Recarga créditos en AI Studio para continuar." };
  }
  const raw = `${error.message || ""}`;
  if (raw.includes("PERMISSION_DENIED") || raw.includes("SERVICE_DISABLED")) {
    return { status: 501, error: "El servicio de IA no está habilitado para este proyecto. Activa la API de Gemini en Google Cloud Console." };
  }
  if (raw.includes("API_KEY_INVALID") || raw.includes("API key not valid")) {
    return { status: 500, error: "La clave de IA configurada no es válida." };
  }
  return { status: 502, error: "Error al procesar el video.", detail: raw.slice(0, 200) };
}

module.exports = {
  extractVideoId,
  fetchYouTubeVideoTitle,
  resolveTier,
  buildQuotaInfo,
  isValidTargetLanguage,
  mapGeminiError,
};
