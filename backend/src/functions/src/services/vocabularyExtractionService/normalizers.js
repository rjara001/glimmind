const CAPTION_ARTIFACT_PATTERNS = [
  /\[[^\]]*\]/g,
  /\([^)]*\)/g,
  /<[^>]*>/g,
];

const DUPLICATE_WORD_PATTERN = /\b(\w+)\s+\1\b/gi;

const GENERIC_WORDS = new Set([
  "people", "thing", "things", "really", "actually", "stuff", "bit", "just",
  "like", "know", "say", "said", "going", "right", "well", "okay", "yeah",
  "get", "got", "go", "went", "come", "came", "think", "make", "take", "give",
  "look", "want", "need", "use", "find", "tell", "ask", "work", "seem", "feel",
  "try", "leave", "call", "keep", "let", "begin", "show", "hear", "play",
  "run", "move", "live", "bring", "happen", "big", "good", "new", "first",
  "last", "long", "great", "little", "back", "must",
]);

const GENERIC_WORDS_PATTERN = new RegExp(
  `\\b(${Array.from(GENERIC_WORDS).join("|")})\\b`,
  "i"
);

const DIFFICULTY_TAGS = new Set(["basic", "intermediate", "advanced"]);
const CATEGORY_TAGS = new Set([
  "phrasal_verb",
  "collocation",
  "common_expression",
  "idiom",
]);

function cleanSegment(text) {
  let output = String(text || "");
  for (const pattern of CAPTION_ARTIFACT_PATTERNS) {
    output = output.replace(pattern, " ");
  }
  output = output.replace(/\s+/g, " ").trim();
  output = output.replace(/^(\w[.,!?;:])/g, "");
  return output.replace(DUPLICATE_WORD_PATTERN, "$1");
}

function cleanTranscript(segments) {
  return segments
    .map((segment) => cleanSegment(segment.text))
    .filter(Boolean)
    .join(" ");
}

function buildTimestampedLines(segments) {
  return segments
    .map((segment) => {
      const text = cleanSegment(segment.text);
      if (!text) return null;
      const start = Number(segment.start) || 0;
      return `[${start.toFixed(1)}] ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function countOccurrences(text, term) {
  const needle = String(term || "").toLowerCase().trim();
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`\\b${escaped}\\b`, "gi");
  const matches = text.match(matcher);
  return matches ? matches.length : 0;
}

function isOverlap(shorter, longer) {
  const shortLower = String(shorter || "").toLowerCase().trim();
  const longLower = String(longer || "").toLowerCase().trim();
  if (!shortLower || !longLower || shortLower === longLower) return false;
  const escaped = shortLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(longLower);
}

function classifyDifficulty(term, difficulty, frequency) {
  if (typeof difficulty === "string" && DIFFICULTY_TAGS.has(difficulty)) {
    return difficulty;
  }
  const wordLen = term.length;
  if (wordLen <= 4 && frequency >= 3) return "basic";
  if (wordLen >= 7 && frequency <= 2) return "advanced";
  return "intermediate";
}

function buildTags(type, category, difficulty) {
  const tags = [difficulty];
  if (type === "phrase") tags.push("phrase");
  if (type === "word") tags.push("word");
  if (typeof category === "string" && CATEGORY_TAGS.has(category)) {
    tags.push(category);
  }
  return tags;
}

function resolveType(rawType, term) {
  if (rawType === "phrase") return "phrase";
  if (rawType === "word") return "word";
  return term.includes(" ") ? "phrase" : "word";
}

function findStartForTerm(cleanedSegments, term) {
  if (!cleanedSegments.length) return 0;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`\\b${escaped}\\b`, "i");
  for (const segment of cleanedSegments) {
    if (matcher.test(segment.text)) {
      return segment.start;
    }
  }
  return 0;
}

function buildResultItems({ parsedItems, maxTerms, cleanedText, cleanedSegments }) {
  const rawItems = Array.isArray(parsedItems) ? parsedItems : [];
  const normalized = [];
  const seen = new Set();

  for (const raw of rawItems) {
    const term = String((raw && raw.term) || "").trim().replace(/\s+/g, " ");
    if (!term) continue;

    const type = resolveType(raw.type, term);
    const lower = term.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    const frequency = countOccurrences(cleanedText, term);
    const start = findStartForTerm(cleanedSegments, term);
    const difficulty = classifyDifficulty(term, raw.difficulty, frequency);
    const category = typeof raw.category === "string" ? raw.category : null;

    let example = String(raw.example || "").trim();
    if (!example) {
      const segmentForTerm = cleanedSegments.find((segment) =>
        new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(segment.text)
      );
      if (segmentForTerm) example = segmentForTerm.text;
    }

    const context = String(raw.context || "").trim();
    const translation = String(raw.translation || "").trim();
    const tags = buildTags(type, category, difficulty);

    normalized.push({
      term,
      type,
      category,
      frequency,
      example,
      context,
      translation,
      start,
      difficulty,
      tags,
      _rawScore: Number(raw.score) || 0,
    });
  }

  // Phrases take precedence over single words contained inside them.
  const orderedByType = normalized.sort((a, b) => {
    if (a.type !== b.type) return a.type === "phrase" ? -1 : 1;
    return b.frequency - a.frequency || b._rawScore - a._rawScore;
  });

  const final = [];
  const acceptedLower = new Set();
  for (const item of orderedByType) {
    const lower = item.term.toLowerCase();
    const containedInPhrase = item.type === "word" && final.some(
      (accepted) => accepted.type === "phrase" && isOverlap(lower, accepted.term)
    );
    const isGeneric = item.type === "word" && GENERIC_WORDS_PATTERN.test(item.term);
    if (containedInPhrase || isGeneric) continue;
    final.push(item);
    acceptedLower.add(lower);
  }

  const limited = final.slice(0, maxTerms);
  return limited.map((item, index) => {
    const rank = index + 1;
    return {
      term: item.term,
      type: item.type,
      frequency: item.frequency,
      example: item.example,
      context: item.context,
      start: item.start,
      score: Math.round(((maxTerms - rank + 1) / maxTerms) * 100) / 100,
      translation: item.translation || undefined,
      metadata: {
        difficulty: item.difficulty,
        frequencyRank: rank,
        audioTimestamp: item.start,
        tags: item.tags,
      },
    };
  });
}

module.exports = {
  cleanSegment,
  cleanTranscript,
  buildTimestampedLines,
  countOccurrences,
  isOverlap,
  buildResultItems,
};