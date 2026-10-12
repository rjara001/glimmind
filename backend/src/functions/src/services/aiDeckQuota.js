// Daily AI point quota for the two deck-generation routes.
//
// This logic was duplicated between createDeckFromText.js and
// youtubeDeckRoutes.js, and in both it read the counters, compared, called
// Gemini, and only then wrote. Concurrent requests all read the same starting
// figure and all spent, so the realised ceiling was `quota x concurrency`.
//
// The reservation now happens inside one transaction, before the Gemini call,
// and is refunded if the call fails.

const { FieldValue } = require("../utils/firebase");
const { runMeteredCall } = require("../utils/meteredQuota");
const { QuotaService } = require("./quotaService");
const { GLOBAL_AI_DAILY_CAP } = require("../utils/constants");

function globalUsageRef(db) {
  return db.collection("usage").doc("global");
}

function quotaError(message, code, quota) {
  const error = new Error(message);
  error.code = code;
  error.quota = quota;
  return error;
}

// Mirrors utils/vocabularyHelpers.buildQuotaInfo, which cannot be imported here
// without pulling the Gemini-facing helpers into the quota path.
function buildQuotaInfo(usedPoints, limit) {
  const remainingPoints = Math.max(0, limit - usedPoints);
  return {
    usedPoints,
    limit,
    remainingPoints,
    usedTodayPercent: limit > 0 ? Math.round((usedPoints / limit) * 100) : 0,
    remainingPercent: limit > 0 ? Math.round((remainingPoints / limit) * 100) : 0,
  };
}

/**
 * The per-user points and the global daily call count as one literal.
 *
 * Both move together: if either rejects the request the transaction aborts and
 * neither is written. The user counter lives on the meta doc, which also holds
 * the tier, so the reservation reads the limit and the counter from one
 * consistent snapshot instead of two separate reads.
 */
function buildAiDeckQuotaSpec(db, metaRef, today, costPercent) {
  return {
    tierRef: metaRef,
    counters: [
      {
        id: "userPoints",
        ref: metaRef,
        field: "ytAiUsedToday",
        periodField: "ytAiDateKey",
        periodValue: today,
        delta: costPercent,
        limit: (tierData) => QuotaService.getAiDailyLimit(tierData && tierData.tier),
        onExceed(used, limit) {
          return quotaError(
            `Tu cuota diaria de IA restante (${
              buildQuotaInfo(used, limit).remainingPercent
            }%) no alcanza para este tamaño (${costPercent}%). Elige un tamaño menor.`,
            "AI_QUOTA_EXCEEDED",
            buildQuotaInfo(used, limit)
          );
        },
        write() {
          return { updatedAt: FieldValue.serverTimestamp() };
        },
      },
      {
        id: "globalCalls",
        ref: globalUsageRef(db),
        field: "aiCalls",
        periodField: "dateKey",
        periodValue: today,
        delta: 1,
        limit: GLOBAL_AI_DAILY_CAP,
        onExceed() {
          return quotaError(
            "El servicio de IA alcanzó su límite diario. Intenta mañana.",
            "AI_GLOBAL_CAP_REACHED",
            null
          );
        },
      },
    ],
  };
}

/**
 * Runs a metered deck generation and returns `{ result, quota }`.
 *
 * `quota` is built from the committed reservation, not from a stale pre-call
 * read, so what the client is told matches what was charged. The reservation is
 * refunded whenever `spend` throws, including when Gemini returns an empty
 * result: the user gets no deck either way.
 */
async function runAiDeckWithQuota(db, metaRef, today, costPercent, spend) {
  const spec = buildAiDeckQuotaSpec(db, metaRef, today, costPercent);

  let quota = null;
  const result = await runMeteredCall(db, spec, spend, (committed, tierData) => {
    quota = buildQuotaInfo(committed.userPoints, QuotaService.getAiDailyLimit(tierData && tierData.tier));
  });

  return { result, quota };
}

module.exports = { buildAiDeckQuotaSpec, runAiDeckWithQuota, globalUsageRef };