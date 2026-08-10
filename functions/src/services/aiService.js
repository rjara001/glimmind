const { GEMINI_MODELS, RETRIES_PER_MODEL, RETRY_BASE_DELAY_MS, PER_CALL_TIMEOUT_MS } = require("../utils/constants");

function sleepWithJitter(attempt) {
  const baseDelay = RETRY_BASE_DELAY_MS * (2 ** attempt);
  const jitter = Math.floor(Math.random() * 1000);
  return new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
}

async function callGemini(apiKey, prompt, processedCount) {
  const { getDb } = require("../utils/firebase");
  const db = getDb();
  const globalRef = db.collection("usage").doc("global");
  const today = require("../utils/helpers").todayKey();

  const globalSnap = await globalRef.get();
  const globalData = globalSnap.exists ? globalSnap.data() : { dateKey: today, aiCalls: 0 };
  const globalCalls = globalData.dateKey === today ? (globalData.aiCalls || 0) : 0;
  const { GLOBAL_AI_DAILY_CAP } = require("../utils/constants");
  if (globalCalls >= GLOBAL_AI_DAILY_CAP) {
    return { error: "El servicio de IA alcanzó su límite diario. Intenta mañana.", status: 429 };
  }

  let result;
  let lastError = null;
  modelLoop:
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      const attemptStartedAt = Date.now();
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
          lastError = new Error(`Gemini HTTP ${response.status}`);
          lastError.code = response.status === 429 ? "RATE_LIMITED" : "GEMINI_ERROR";
          console.error(`[AI] model=${model} attempt ${attempt + 1}/${RETRIES_PER_MODEL} failed: status=${response.status} latency=${Date.now() - attemptStartedAt}ms body=${bodyText.slice(0, 300)}`);
          if (response.status === 429 || response.status >= 500) {
            if (attempt < RETRIES_PER_MODEL - 1) {
              await sleepWithJitter(attempt);
              continue;
            }
            continue modelLoop;
          }
          throw lastError;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = new Error("Respuesta vacía de la IA.");
          lastError.code = "GEMINI_ERROR";
          if (attempt < RETRIES_PER_MODEL - 1) {
            await sleepWithJitter(attempt);
            continue;
          }
          continue modelLoop;
        }
        result = JSON.parse(text.trim());
        break modelLoop;
      } catch (error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
          lastError = new Error(`La IA tardó demasiado en responder (más de ${PER_CALL_TIMEOUT_MS / 1000} segundos).`);
          lastError.code = "GEMINI_ERROR";
          console.error(`[AI] model=${model} attempt ${attempt + 1}/${RETRIES_PER_MODEL} timed out after ${PER_CALL_TIMEOUT_MS / 1000}s`);
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

  result = result
    .filter((group) => group && typeof group.groupName === "string")
    .map((group) => ({
      groupName: group.groupName,
      indices: Array.isArray(group.indices)
        ? group.indices.filter((i) => Number.isInteger(i) && i >= 0 && i < processedCount)
        : [],
    }))
    .filter((group) => group.indices.length > 0);

  return { result, globalCalls };
}

module.exports = { callGemini };
