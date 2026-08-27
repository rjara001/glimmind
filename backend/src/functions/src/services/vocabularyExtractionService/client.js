const { GoogleGenAI } = require("@google/genai");
const { VOCABULARY_GEMINI_MODELS, VOCABULARY_MAX_OUTPUT_TOKENS } = require("../../utils/constants");

const PER_MODEL_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 3000;
const PER_CALL_TIMEOUT_MS = 120000;
const REDUCED_MAX_OUTPUT_TOKENS = 8192;
const OUTPUT_TOKEN_LIMIT_ERROR_PATTERN = /max[_ ]?output[_ ]?token|output[_ ]?token limit|INVALID_ARGUMENT/i;

function sleepWithJitter(attempt) {
  const baseDelay = RETRY_BASE_DELAY_MS * (2 ** attempt);
  const jitter = Math.floor(Math.random() * 1000);
  return new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
}

async function requestWithTokenCap(ai, model, prompt, maxOutputTokens, allowReduce) {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens,
        temperature: 0.3,
        httpOptions: { timeout: PER_CALL_TIMEOUT_MS },
      },
    });

    const text = response?.text?.trim();
    if (!text) {
      const error = new Error(`Empty response from model ${model}`);
      error.code = "GEMINI_ERROR";
      throw error;
    }
    return text;
  } catch (error) {
    if (
      allowReduce &&
      OUTPUT_TOKEN_LIMIT_ERROR_PATTERN.test(`${error.message || error.code || ""}`)
    ) {
      // Older models may reject the large output budget; retry with the previous cap.
      return requestWithTokenCap(ai, model, prompt, REDUCED_MAX_OUTPUT_TOKENS, false);
    }
    throw error;
  }
}

function requestVocabularyGeneration(ai, model, prompt, maxOutputTokens) {
  return requestWithTokenCap(ai, model, prompt, maxOutputTokens, true);
}

async function generateVocabulary(apiKey, prompt) {
  const ai = new GoogleGenAI({ apiKey });
  let lastError = null;

  modelLoop:
  for (const model of VOCABULARY_GEMINI_MODELS) {
    for (let attempt = 0; attempt < PER_MODEL_RETRIES; attempt++) {
      try {
        return await requestVocabularyGeneration(ai, model, prompt, VOCABULARY_MAX_OUTPUT_TOKENS);
      } catch (error) {
        lastError = error;
        const message = `${error.message || error.code || ""}`;
        console.error(`[VocabularyGemini] model=${model} attempt=${attempt + 1}/${PER_MODEL_RETRIES} failed: ${message.slice(0, 300)}`);

        if (message.includes("credits") || message.includes("billing") || message.includes("CREDIT")) {
          error.code = "BILLING_ERROR";
          throw error;
        }

        const modelUnavailable = message.includes("not found") || message.includes("no longer available") || message.includes("not supported") || message.includes("NOT_FOUND");
        const transient =
          message.includes("429") ||
          message.includes("503") ||
          message.includes("UNAVAILABLE") ||
          message.includes("high demand") ||
          message.includes("timeout") ||
          message.includes("TIMEOUT") ||
          message.includes("RESOURCE_EXHAUSTED") ||
          error.code === "RATE_LIMITED";
        const retryable = transient || error.code === "GEMINI_ERROR";

        if (modelUnavailable) {
          continue modelLoop;
        }
        if (retryable && attempt < PER_MODEL_RETRIES - 1) {
          await sleepWithJitter(attempt);
          continue;
        }
        if (retryable) {
          continue modelLoop;
        }
        throw error;
      }
    }
  }

  if (lastError) {
    const lastMessage = `${lastError.message || lastError.code || ""}`;
    const code = lastMessage.includes("429") || lastMessage.includes("503") || lastMessage.includes("UNAVAILABLE")
      ? "RATE_LIMITED"
      : "GEMINI_ERROR";
    lastError.code = code;
  }
  throw lastError || new Error("Gemini vocabulary generation failed");
}

module.exports = {
  generateVocabulary,
  sleepWithJitter,
};