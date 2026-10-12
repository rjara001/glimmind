const { runMeteredCall } = require("../../utils/meteredQuota");
const { buildSttQuotaSpec, logSttQuotaReserved, resolveCurrentMonthKey } = require("./quota");
const { sendAudioToChirpRecognizer, sendAudioToGoogleSpeechRecognition } = require("./api");
const { CHIPTT_STT_GLOBAL_LIMIT, CHIPTT_STT_USER_LIMIT, CHIPTT_STT_PREMIUM_USER_LIMIT } = require("../../utils/constants");

/**
 * Runs one metered transcription.
 *
 * The quota is reserved *before* `spend` runs. It used to be checked after, so
 * an over-quota user was billed by Google and then told 429. It is refunded if
 * the call fails, including NO_SPEECH, which the product does not charge for.
 *
 * There is deliberately no reserve-without-refund entry point: `spend` and the
 * reservation are paired inside runMeteredCall.
 */
async function transcribeWithQuota(db, uid, audioSeconds, spend) {
  const monthKey = resolveCurrentMonthKey();
  const spec = buildSttQuotaSpec(db, uid, monthKey, audioSeconds);

  return runMeteredCall(db, spec, spend, (committed) =>
    logSttQuotaReserved(uid, audioSeconds, committed)
  );
}

module.exports = {
  transcribeWithQuota,
  sendAudioToChirpRecognizer,
  sendAudioToGoogleSpeechRecognition,
  CHIPTT_STT_GLOBAL_LIMIT,
  CHIPTT_STT_USER_LIMIT,
  CHIPTT_STT_PREMIUM_USER_LIMIT,
};
