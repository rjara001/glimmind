const { GEMINI_MODELS, RETRIES_PER_MODEL, RETRY_BASE_DELAY_MS, PER_CALL_TIMEOUT_MS, GEMINI_API_BASE_URL } = require("../../utils/constants");

function sleepWithJitter(attempt) {
  const baseDelay = RETRY_BASE_DELAY_MS * (2 ** attempt);
  const jitter = Math.floor(Math.random() * 1000);
  return new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
}

async function requestGeminiModelGeneration(apiKey, model, prompt) {
  const attemptStartedAt = Date.now();
  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(PER_CALL_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const error = new Error(`Gemini HTTP ${response.status}`);
    error.code = response.status === 429 ? "RATE_LIMITED" : "GEMINI_ERROR";
    console.error(`[AI] model=${model} attempt failed: status=${response.status} latency=${Date.now() - attemptStartedAt}ms body=${bodyText.slice(0, 300)}`);
    throw error;
  }

  return response;
}

function extractTextFromGeminiResponse(data) {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const error = new Error("Respuesta vacía de la IA.");
    error.code = "GEMINI_ERROR";
    throw error;
  }
  return text;
}

function normalizeGroupingResult(parsedResult, processedCount) {
  return parsedResult
    .filter((group) => group && typeof group.groupName === "string")
    .map((group) => ({
      groupName: group.groupName,
      indices: Array.isArray(group.indices)
        ? group.indices.filter((i) => Number.isInteger(i) && i >= 0 && i < processedCount)
        : [],
    }))
    .filter((group) => group.indices.length > 0);
}

module.exports = {
  sleepWithJitter,
  requestGeminiModelGeneration,
  extractTextFromGeminiResponse,
  normalizeGroupingResult,
};
