const { getDb } = require("../../utils/firebase");
const { fetchTtsQuotaDocuments, assertGlobalTtsQuotaHasCapacity, assertUserTtsQuotaHasCapacity, persistTtsQuotaUsage, resolveCurrentMonthKey } = require("./quota");
const { sendTextToChirpSynthesizer } = require("./api");
const { CHIRP_TTS_GLOBAL_LIMIT, CHIRP_TTS_USER_LIMIT, CHIRP_TTS_PREMIUM_USER_LIMIT } = require("../../utils/constants");

async function verifyUserHasRemainingTtsQuota(db, uid, charCount) {
  const monthKey = resolveCurrentMonthKey();
  const { globalRef, userRef, globalData, userData } = await fetchTtsQuotaDocuments(db, uid, monthKey);
  assertGlobalTtsQuotaHasCapacity(globalData, charCount);
  await assertUserTtsQuotaHasCapacity(db, uid, userData, charCount);
  await persistTtsQuotaUsage(db, globalRef, userRef, globalData, userData, charCount, monthKey);
}

module.exports = {
  verifyUserHasRemainingTtsQuota,
  sendTextToChirpSynthesizer,
  CHIRP_TTS_GLOBAL_LIMIT,
  CHIRP_TTS_USER_LIMIT,
  CHIRP_TTS_PREMIUM_USER_LIMIT,
};
