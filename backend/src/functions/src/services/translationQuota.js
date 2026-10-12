const { snapshotNumber } = require("../utils/meteredQuota");
const {
  TRANSLATION_GLOBAL_MONTHLY_CHARS,
  TRANSLATION_USER_MONTHLY_CHARS,
  TRANSLATION_PREMIUM_USER_MONTHLY_CHARS,
} = require("../utils/constants");

function resolveCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildTranslationQuotaDocumentRefs(db, uid, monthKey) {
  const globalRef = db.collection("usage_stats").doc(`translation_global_${monthKey}`);
  const userRef = db.collection("users").doc(uid).collection("usage").doc(`translation_${monthKey}`);

  return { globalRef, userRef };
}

function userTranslationLimit(tierData) {
  return tierData && tierData.tier === "premium"
    ? TRANSLATION_PREMIUM_USER_MONTHLY_CHARS
    : TRANSLATION_USER_MONTHLY_CHARS;
}

function quotaError(message, code, used, limit) {
  const error = new Error(message);
  error.code = code;
  error.used = used;
  error.limit = limit;
  return error;
}

/**
 * Both counters as one literal.
 *
 * reserveQuota compares and increments them inside a single transaction, so
 * concurrent requests can no longer each pass the check against the same
 * starting figure.
 */
function buildTranslationQuotaSpec(db, uid, monthKey, incomingChars) {
  const { globalRef, userRef } = buildTranslationQuotaDocumentRefs(db, uid, monthKey);

  return {
    tierRef: db.collection("users").doc(uid).collection("meta").doc("main"),
    counters: [
      {
        id: "globalChars",
        ref: globalRef,
        field: "totalCharactersTranslated",
        periodField: "currentMonth",
        periodValue: monthKey,
        delta: incomingChars,
        limit: TRANSLATION_GLOBAL_MONTHLY_CHARS,
        onExceed(used, limit) {
          return quotaError(
            "Límite global mensual de traducción alcanzado.",
            "TRANSLATION_GLOBAL_QUOTA_EXCEEDED",
            used,
            limit
          );
        },
        write(_next, snapshot) {
          return {
            currentMonth: monthKey,
            totalCalls: snapshotNumber(snapshot, "totalCalls") + 1,
          };
        },
      },
      {
        id: "userChars",
        ref: userRef,
        field: "charactersTranslated",
        periodField: "currentMonth",
        periodValue: monthKey,
        delta: incomingChars,
        limit: userTranslationLimit,
        onExceed(used, limit) {
          return quotaError(
            `Has alcanzado tu límite mensual de traducciones (${limit} caracteres).`,
            "TRANSLATION_USER_QUOTA_EXCEEDED",
            used,
            limit
          );
        },
        write(_next, snapshot) {
          return {
            userId: uid,
            currentMonth: monthKey,
            callCount: snapshotNumber(snapshot, "callCount") + 1,
            lastTranslationAt: new Date(),
          };
        },
      },
    ],
  };
}

module.exports = {
  resolveCurrentMonthKey,
  buildTranslationQuotaDocumentRefs,
  buildTranslationQuotaSpec,
  userTranslationLimit,
};