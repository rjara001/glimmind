const { getDb } = require("../../utils/firebase");
const { fetchSttQuotaDocuments, assertGlobalSttQuotaHasCapacity, assertUserSttQuotaHasCapacity, logSttQuotaCheckPassed, persistSttQuotaUsage, resolveCurrentMonthKey } = require("./quota");
const { sendAudioToChirpRecognizer, sendAudioToGoogleSpeechRecognition } = require("./api");
const { CHIPTT_STT_GLOBAL_LIMIT, CHIPTT_STT_USER_LIMIT, CHIPTT_STT_PREMIUM_USER_LIMIT } = require("../../utils/constants");

async function verifyUserHasRemainingSttQuota(db, uid, audioSeconds) {
  const monthKey = resolveCurrentMonthKey();
  const { globalRef, userRef, globalData, userData } = await fetchSttQuotaDocuments(db, uid, monthKey);
  assertGlobalSttQuotaHasCapacity(globalData, audioSeconds);
  await assertUserSttQuotaHasCapacity(db, uid, userData, audioSeconds);
  logSttQuotaCheckPassed(uid, audioSeconds, globalData, userData);
  await persistSttQuotaUsage(db, globalRef, userRef, globalData, userData, audioSeconds, monthKey);
}

module.exports = {
  verifyUserHasRemainingSttQuota,
  sendAudioToChirpRecognizer,
  sendAudioToGoogleSpeechRecognition,
  CHIPTT_STT_GLOBAL_LIMIT,
  CHIPTT_STT_USER_LIMIT,
  CHIPTT_STT_PREMIUM_USER_LIMIT,
};
