const {
  VIDEO_MAX_SECONDS,
  VOCABULARY_TERMS_THRESHOLD_COMPACT_CONTEXT,
} = require("../../utils/constants");
const {
  cleanTranscript,
  cleanSegment,
  buildTimestampedLines,
  buildResultItems,
} = require("./normalizers");
const { buildVocabularyPrompt } = require("./prompt");
const { generateVocabulary } = require("./client");

function parseVocabularyJson(text) {
  const cleaned = String(text || "").trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : cleaned;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    // Recovery for truncated output: keep the longest parseable JSON prefix.
    for (let i = candidate.length - 1; i >= 0; i--) {
      if (candidate[i] !== "}") continue;
      const prefix = candidate.slice(0, i + 1);
      try {
        const fixed = prefix + computeMissingClosers(prefix);
        const parsed = JSON.parse(fixed);
        console.warn(`[VocabularyExtraction] salvaged truncated JSON response (length ${fixed.length})`);
        return parsed;
      } catch {
        // keep scanning backwards for the last complete object
      }
    }
    throw error;
  }
}

const CLOSING_FOR = { "{": "}", "[": "]" };

function computeMissingClosers(text) {
  const stack = [];
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(CLOSING_FOR[ch]);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
  }
  return stack.reverse().join("");
}

async function extractVocabulary({ apiKey, segments, maxTerms, targetLanguage, level }) {
  const originalCount = segments.length;
  const limitedSegments = segments.filter(
    (segment) => Number(segment.start) <= VIDEO_MAX_SECONDS
  );
  const wasTruncated = limitedSegments.length < originalCount;

  const cleanedText = cleanTranscript(limitedSegments);
  if (!cleanedText) {
    return { items: [], wasTruncated };
  }

  const cleanedSegments = limitedSegments
    .map((segment) => ({
      start: Number(segment.start) || 0,
      text: cleanSegment(segment.text),
    }))
    .filter((segment) => segment.text.length > 0);

  const timestamped = buildTimestampedLines(limitedSegments);
  const compactContext = maxTerms >= VOCABULARY_TERMS_THRESHOLD_COMPACT_CONTEXT;

  const prompt = buildVocabularyPrompt({
    timestamped,
    maxTerms,
    targetLanguage,
    level,
    compactContext,
  });

  const rawJson = await generateVocabulary(apiKey, prompt);
  let parsed;
  try {
    parsed = parseVocabularyJson(rawJson);
  } catch (error) {
    const parseError = new Error("Gemini returned malformed JSON for the vocabulary extraction");
    parseError.code = "GEMINI_ERROR";
    console.error(`[VocabularyExtraction] malformed JSON: ${rawJson.slice(0, 500)}`);
    throw parseError;
  }

  const items = buildResultItems({
    parsedItems: parsed.items,
    maxTerms,
    cleanedText,
    cleanedSegments,
  });

  return { items, wasTruncated };
}

module.exports = { extractVocabulary, parseVocabularyJson };