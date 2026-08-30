const LANGUAGE_NAMES = {
  es: "Spanish",
  de: "German",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  en: "English",
};

const LEVEL_RULES = {
  b1: `
- Prioritize high-frequency everyday phrases, phrasal verbs and intermediate words (B1).
- Favor terms that are immediately useful for conversation and comprehension.
- Prefer straightforward collocations over obscure idioms.`,
  b2c1: `
- Prioritize B2-C1 idioms, phrasal verbs, collocations and sophisticated expressions.
- Favor terms a motivated upper-intermediate/advanced learner would not know yet.
- Skip trivial words and literal verb+preposition pairs with no idiomatic value.`,
};

function buildVocabularyPrompt({ timestamped, maxTerms, targetLanguage, level, compactContext }) {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const contextRule = compactContext
    ? "Keep the context field SHORT: at most 12 words around the term (no long sentences)."
    : "Keep the context field compact: at most 30 words around the term.";

  return `You are an expert English vocabulary tutor for people learning English. Analyze the YouTube video transcript below and extract the most valuable vocabulary for a flashcard deck.

TRANSCRIPT (each line starts with the timestamp in seconds):
${timestamped}

CONFIG:
- Number of terms requested: ${maxTerms}
- Translate every term into: ${targetLanguageName}
- Learner profile:${LEVEL_RULES[level] || LEVEL_RULES.b1}
- ${contextRule}

SELECTION RULES:
- Prioritize phrasal verbs, common expressions, idioms and collocations, plus 2-4 token word combinations.
- Mix phrases and single words; single words should be moderately challenging, not filler words.
- Avoid proper names, numbers, and generic utterances.
- Prefer terms that are contextually relevant to THIS video's topic.

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "title": "a concise, catchy deck name (3-8 words) summarizing the TOPIC of this content, in ${targetLanguageName}",
  "items": [
    {
      "term": "the term or phrase (as it appears verbatim in the transcript)",
      "type": "word" | "phrase",
      "category": "phrasal_verb" | "collocation" | "common_expression" | "idiom" | null,
      "example": "one verbatim sentence from the transcript containing the term",
      "context": "short window around the term following the context rule",
      "start": <float, seconds of the transcript line where the term first appears>,
      "translation": "<${targetLanguageName} translation of the term>",
      "difficulty": "basic" | "intermediate" | "advanced"
    }
  ]
}

RULES:
- The "example" and the "term" must appear verbatim in the transcript, so the timestamp can be aligned.
- Return between ${Math.max(5, Math.floor(maxTerms * 0.7))} and ${maxTerms} items.
- Return exactly one "title". Make it specific to this content's topic (not generic), short and memorable.
- No markdown, no comments, no extra keys.`;
}

module.exports = { buildVocabularyPrompt };