const { GEMINI_MODELS, RETRIES_PER_MODEL, RETRY_BASE_DELAY_MS, PER_CALL_TIMEOUT_MS, GEMINI_API_BASE_URL, GLOBAL_AI_DAILY_CAP } = require("../utils/constants");

function sleepWithJitter(attempt) {
  const baseDelay = RETRY_BASE_DELAY_MS * (2 ** attempt);
  const jitter = Math.floor(Math.random() * 1000);
  return new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
}

async function verifyGlobalAiQuotaNotExceeded(db) {
  const globalRef = db.collection("usage").doc("global");
  const today = require("../utils/helpers").todayKey();

  const globalSnap = await globalRef.get();
  const globalData = globalSnap.exists ? globalSnap.data() : { dateKey: today, aiCalls: 0 };
  const globalCalls = globalData.dateKey === today ? (globalData.aiCalls || 0) : 0;

  if (globalCalls >= GLOBAL_AI_DAILY_CAP) {
    return { error: "El servicio de IA alcanzó su límite diario. Intenta mañana.", status: 429, globalCalls };
  }

  return { globalCalls };
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

async function callGeminiWithRetryAndFallback(apiKey, prompt, processedCount) {
  const { getDb } = require("../utils/firebase");
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
          console.error(`[AI] model=${model} attempt ${attempt + 1}/${RETRIES_PER_MODEL} timed out after ${PER_CALL_TIMEOUT_MS / 1000}s`);
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

module.exports = { callGeminiWithRetryAndFallback };
