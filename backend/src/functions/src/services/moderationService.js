const { scanForBannedKeywords } = require("../utils/moderationKeywords");
const { PUBLISH_DUPLICATE_SIMILARITY } = require("../utils/constants");

function normalizeTerm(str) {
  if (typeof str !== "string") return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  const m = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}

function similarity(a, b) {
  const an = normalizeTerm(a);
  const bn = normalizeTerm(b);
  if (an === bn) return 1;
  const max = Math.max(an.length, bn.length);
  if (!max) return 0;
  return (max - levenshtein(an, bn)) / max;
}

function extractCardTexts(associations) {
  if (!Array.isArray(associations)) return [];
  return associations.map((a) => {
    if (typeof a === "string") return a;
    const term = a.term || "";
    const def = Array.isArray(a.definition) ? a.definition.join(" ") : (a.definition || "");
    return `${term} ${def}`;
  });
}

function moderateByKeywords(associations, meta) {
  const texts = extractCardTexts(associations);
  const metaText = [meta?.name, meta?.description, Array.isArray(meta?.tags) ? meta.tags.join(" ") : ""]
    .filter(Boolean)
    .join(" ");

  const flagged = [];
  let reviewCount = 0;

  texts.forEach((text, index) => {
    const matches = scanForBannedKeywords(text);
    if (matches.length > 0) {
      flagged.push({ index, reason: matches.map((m) => m.category).join(",") });
      reviewCount += 1;
    }
  });

  const metaMatches = scanForBannedKeywords(metaText);
  if (metaMatches.length > 0) {
    flagged.push({ index: -1, reason: `META:${metaMatches.map((m) => m.category).join(",")}` });
    reviewCount += 1;
  }

  return { reviewCount, flagged };
}

async function callAiForClassification(_text) {
  return { level: "approved", reason: "AI_DISABLED" };
}

function aggregateModeration(associations, keywordResult, aiResults) {
  const total = Array.isArray(associations) ? associations.length : 0;
  const reviewSet = new Set(keywordResult.flagged.map((f) => f.index));
  const flagged = [...keywordResult.flagged];

  aiResults.forEach((r) => {
    if (r.level === "review" || r.level === "rejected") {
      if (!reviewSet.has(r.index)) {
        flagged.push({ index: r.index, reason: r.reason || "AI" });
      }
      reviewSet.add(r.index);
    }
  });

  const review = reviewSet.size;
  const rejected = flagged.filter((f) => f.reason === "AI_REJECTED").length;
  const approved = Math.max(0, total - review);

  let level = "approved";
  if (rejected > 0) level = "rejected";
  else if (review > 0) level = "review";

  return { approved, review, rejected, flaggedItems: flagged, level };
}

async function moderateDeckContent(associations, meta) {
  const keywordResult = moderateByKeywords(associations, meta);
  const texts = extractCardTexts(associations);
  const aiResults = [];
  for (let i = 0; i < texts.length; i++) {
    try {
      const r = await callAiForClassification(texts[i]);
      aiResults.push({ index: i, level: r.level, reason: r.reason });
    } catch (error) {
      console.warn(`[moderation] AI classification failed for index=${i}:`, error?.message || error);
      aiResults.push({ index: i, level: "approved", reason: "AI_FALLBACK" });
    }
  }
  return aggregateModeration(associations, keywordResult, aiResults);
}

function computeTermOverlap(termsA, termsB) {
  const setA = new Set(termsA.map(normalizeTerm).filter(Boolean));
  const setB = new Set(termsB.map(normalizeTerm).filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  let matched = 0;
  for (const a of setA) {
    if (setB.has(a)) {
      matched += 1;
      continue;
    }
    for (const b of setB) {
      if (similarity(a, b) >= PUBLISH_DUPLICATE_SIMILARITY) {
        matched += 1;
        break;
      }
    }
  }
  return matched / setA.size;
}

function extractDeckTerms(deck) {
  if (!deck || !Array.isArray(deck.associations)) return [];
  return deck.associations.map((a) => a.term || "").filter(Boolean);
}

async function findDuplicateByContent(db, associations) {
  const userTerms = associations.map((a) => a.term || "").filter(Boolean);
  if (!userTerms.length) return null;
  const snapshot = await db.collection("prebuiltDecks").get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const otherTerms = extractDeckTerms(data);
    if (!otherTerms.length) continue;
    const overlap = computeTermOverlap(userTerms, otherTerms);
    if (overlap >= PUBLISH_DUPLICATE_SIMILARITY) {
      return { id: doc.id, name: data.name, overlap };
    }
  }
  return null;
}

module.exports = {
  moderateDeckContent,
  findDuplicateByContent,
  normalizeTerm,
  similarity,
  extractCardTexts,
  computeTermOverlap,
};
