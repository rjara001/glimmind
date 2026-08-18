const { getDb } = require("../../utils/firebase");
const { GEMINI_MODELS, RETRIES_PER_MODEL } = require("../../utils/constants");
const { verifyGlobalAiQuotaNotExceeded } = require("./quota");
const { requestGeminiModelGeneration, extractTextFromGeminiResponse, normalizeGroupingResult, sleepWithJitter } = require("./client");

async function callGeminiWithRetryAndFallback(apiKey, prompt, processedCount) {
  const db = getDb();

  const quotaCheck = await verifyGlobalAiQuotaNotExceeded(db);
  if (quotaCheck.error) {
    return quotaCheck;
  }

  let result;
  let lastError = null;

  modelLoop:
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      try {
        const response = await requestGeminiModelGeneration(apiKey, model, prompt);
        const data = await response.json();
        const text = extractTextFromGeminiResponse(data);
        result = JSON.parse(text.trim());
        break modelLoop;
      } catch (error) {
        lastError = error;
        if (error.name === "TimeoutError" || error.name === "AbortError") {
          console.error(`[AI] model=${model} attempt ${attempt + 1}/${RETRIES_PER_MODEL} timed out after ${process.env.PER_CALL_TIMEOUT_MS / 1000}s`);
          if (attempt < RETRIES_PER_MODEL - 1) {
            await sleepWithJitter(attempt);
            continue;
          }
          continue modelLoop;
        }
        if (error.code === "RATE_LIMITED" || error.code === "GEMINI_ERROR") {
          if (attempt < RETRIES_PER_MODEL - 1) {
            await sleepWithJitter(attempt);
            continue;
          }
          continue modelLoop;
        }
        throw error;
      }
    }
  }

  if (result === undefined) {
    if (lastError && lastError.code === "RATE_LIMITED") {
      return { error: "El servicio de IA está temporalmente saturado. Intenta en unos minutos.", status: 503 };
    }
    return { error: "Error al procesar la lista con IA.", status: 502 };
  }

  const normalizedResult = normalizeGroupingResult(result, processedCount);
  return { result: normalizedResult, globalCalls: quotaCheck.globalCalls };
}

module.exports = {
  callGeminiWithRetryAndFallback,
};
