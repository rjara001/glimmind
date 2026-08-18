const { getAccessToken } = require("../utils/googleApiClient");
const { GOOGLE_VOICES_URL } = require("../utils/constants");

const VOICE_LIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedVoices = null;
let cachedAt = 0;

function isChirpVoice(name) {
  if (!name) return false;
  const upper = name.toUpperCase();
  return upper.includes("CHIRP");
}

function mapGoogleVoice(voice) {
  const name = voice.name || "";
  const languageCode = voice.languageCode || "";
  const derivedLang = languageCode || name.split("-").slice(0, 2).join("-");
  const lang = derivedLang.split("-")[0];

  return {
    id: name,
    languageCode: derivedLang,
    label: name,
    lang,
  };
}

async function fetchChirpVoicesFromGoogle() {
  const accessToken = await getAccessToken();

  const response = await fetch(
    GOOGLE_VOICES_URL,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const error = new Error(`TTS voices HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
    error.code = "VOICES_ERROR";
    throw error;
  }

  const data = await response.json();
  if (!Array.isArray(data.voices)) {
    console.log("[listTtsVoices] Google response missing voices array", JSON.stringify(data).slice(0, 500));
    return [];
  }

  console.log("[listTtsVoices] Google returned voices count=", data.voices.length, "sample=", data.voices.slice(0, 5).map(v => v.name));

  const filtered = data.voices
    .filter((voice) => isChirpVoice(voice.name))
    .map(mapGoogleVoice);

  console.log("[listTtsVoices] filtered Chirp voices count=", filtered.length, "sample=", filtered.slice(0, 5).map(v => v.id));

  return filtered;
}

async function getCachedOrFreshChirpVoices() {
  const now = Date.now();
  if (cachedVoices && now - cachedAt < VOICE_LIST_CACHE_TTL_MS) {
    return cachedVoices;
  }

  const voices = await fetchChirpVoicesFromGoogle();
  cachedVoices = voices;
  cachedAt = now;
  return voices;
}

module.exports = {
  getCachedOrFreshChirpVoices,
};
