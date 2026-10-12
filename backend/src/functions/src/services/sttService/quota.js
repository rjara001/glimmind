const { snapshotNumber } = require("../../utils/meteredQuota");
const {
  CHIPTT_STT_GLOBAL_LIMIT,
  CHIPTT_STT_USER_LIMIT,
  CHIPTT_STT_PREMIUM_USER_LIMIT,
} = require("../../utils/constants");

function resolveCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildSttQuotaDocumentRefs(db, uid, monthKey) {
  const globalRef = db
    .collection("usage")
    .doc("chipttStt")
    .collection("global")
    .doc(monthKey);

  const userRef = db
    .collection("usage")
    .doc("chipttStt")
    .collection("users")
    .doc(uid)
    .collection("months")
    .doc(monthKey);

  return { globalRef, userRef };
}

function userSttLimit(tierData) {
  return tierData && tierData.tier === "premium"
    ? CHIPTT_STT_PREMIUM_USER_LIMIT
    : CHIPTT_STT_USER_LIMIT;
}

function quotaError(message, code, used, limit, details) {
  const error = new Error(message);
  error.code = code;
  error.used = used;
  error.limit = limit;
  if (details) Object.assign(error, details);
  return error;
}

/**
 * Both counters as one literal.
 *
 * reserveQuota compares and increments them inside a single transaction, so
 * concurrent requests can no longer each pass the check against the same
 * starting figure.
 */
function buildSttQuotaSpec(db, uid, monthKey, audioSeconds) {
  const { globalRef, userRef } = buildSttQuotaDocumentRefs(db, uid, monthKey);

  return {
    tierRef: db.collection("users").doc(uid).collection("meta").doc("main"),
    counters: [
      {
        id: "globalAudioSecondsUsed",
        ref: globalRef,
        field: "audioSecondsUsed",
        periodField: "monthKey",
        periodValue: monthKey,
        delta: audioSeconds,
        limit: CHIPTT_STT_GLOBAL_LIMIT,
        onExceed(used, limit) {
          console.error('[Chiptt] global quota exceeded', {
            audioSeconds,
            globalUsed: used,
            globalLimit: limit,
          });
          return quotaError(
            "El servicio de transcripción alcanzó su límite mensual global. Intenta el próximo mes.",
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
        id: "userAudioSecondsUsed",
        ref: userRef,
        field: "audioSecondsUsed",
        periodField: "monthKey",
        periodValue: monthKey,
        delta: audioSeconds,
        limit: userSttLimit,
        onExceed(used, limit) {
          console.error('[Chiptt] user quota exceeded', {
            uid,
            audioSeconds,
            userUsed: used,
            userLimit: limit,
          });
          return quotaError(
            `Llegaste a tu límite mensual de transcripción (${limit} segundos). Vuelve el próximo mes.`,
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

function logSttQuotaReserved(uid, audioSeconds, committed) {
  console.error('[Chiptt] quota reserved', {
    uid,
    audioSeconds,
    globalUsed: committed.globalAudioSecondsUsed,
    userUsed: committed.userAudioSecondsUsed,
  });
}

module.exports = {
  resolveCurrentMonthKey,
  buildSttQuotaDocumentRefs,
  buildSttQuotaSpec,
  logSttQuotaReserved,
};