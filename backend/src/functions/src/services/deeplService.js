const { DEEPL_FREE_URL } = require("../utils/constants");

const DEEPL_TIMEOUT_MS = 30000;

async function translateWithDeepL(cards, targetLang, sourceLang = "en") {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.warn("[deeplService] DEEPL_API_KEY not configured, skipping DeepL");
    return null;
  }

  const terms = cards.map((c) => c.term);
  const contextParts = cards
    .map((c) => c.context)
    .filter(Boolean);
  const context = contextParts.length > 0 ? contextParts.join(" ") : undefined;

  const payload = {
    text: terms,
    source_lang: sourceLang.toUpperCase(),
    target_lang: targetLang.toUpperCase(),
  };

  if (context) {
    payload.context = context;
  }

  const response = await fetch(DEEPL_FREE_URL, {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(DEEPL_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const error = new Error(`DeepL API error ${response.status}: ${errorText}`);
    error.code = response.status === 429 ? "RATE_LIMITED" : "API_ERROR";
    throw error;
  }

  const data = await response.json();

  if (!data.translations || data.translations.length !== terms.length) {
    throw new Error("DeepL returned invalid number of translations");
  }

  return data.translations.map((t) => t.text);
}

module.exports = { translateWithDeepL };
