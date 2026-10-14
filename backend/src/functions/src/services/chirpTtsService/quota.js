const { snapshotNumber } = require("../../utils/meteredQuota");
const {
  CHIRP_TTS_GLOBAL_LIMIT,
  CHIRP_TTS_PREMIUM_USER_LIMIT,
} = require("../../utils/constants");

function resolveCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildTtsQuotaDocumentRefs(db, uid, monthKey) {
  const globalRef = db
    .collection("usage")
    .doc("chirpTts")
    .collection("global")
    .doc(monthKey);

  const userRef = db
    .collection("usage")
    .doc("chirpTts")
    .collection("users")
    .doc(uid)
    .collection("months")
    .doc(monthKey);

  return { globalRef, userRef };
}

function userTtsLimit(tierData) {
  // Rule 0 (BUSINESS_MODEL §1/§4): the free tier never reaches a billed API,
  // so its effective monthly limit is zero and the request is rejected inside
  // the same transaction that reads the tier.
  return tierData && tierData.tier === "premium" ? CHIRP_TTS_PREMIUM_USER_LIMIT : 0;
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
function buildTtsQuotaSpec(db, uid, monthKey, charCount) {
  const { globalRef, userRef } = buildTtsQuotaDocumentRefs(db, uid, monthKey);

  return {
    tierRef: db.collection("users").doc(uid).collection("meta").doc("main"),
    counters: [
      {
        id: "globalCharsUsed",
        ref: globalRef,
        field: "charsUsed",
        periodField: "monthKey",
        periodValue: monthKey,
        delta: charCount,
        limit: CHIRP_TTS_GLOBAL_LIMIT,
        onExceed(used, limit) {
          return quotaError(
            "El servicio de voz alcanzó su límite mensual global. Intenta el próximo mes.",
            "GLOBAL_QUOTA_EXCEEDED",
            used,
            limit
          );
        },
        write(_next, snapshot) {
          return { monthKey, totalCalls: snapshotNumber(snapshot, "totalCalls") + 1 };
        },
      },
      {
        id: "userCharsUsed",
        ref: userRef,
        field: "charsUsed",
        periodField: "monthKey",
        periodValue: monthKey,
        delta: charCount,
        limit: userTtsLimit,
        onExceed(used, limit) {
          if (limit === 0) {
            return quotaError(
              "Chirp 3 HD es una función Premium. Actualiza tu plan para usarla.",
              "TIER_REQUIRED",
              used,
              limit
            );
          }
          return quotaError(
            `Llegaste a tu límite mensual de voz (${limit} caracteres). Vuelve el próximo mes.`,
            "USER_QUOTA_EXCEEDED",
            used,
            limit
          );
        },
        write(_next, snapshot) {
          return { monthKey, callCount: snapshotNumber(snapshot, "callCount") + 1 };
        },
      },
    ],
  };
}

module.exports = {
  resolveCurrentMonthKey,
  buildTtsQuotaDocumentRefs,
  buildTtsQuotaSpec,
};