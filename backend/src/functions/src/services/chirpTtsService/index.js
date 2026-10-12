const { runMeteredCall } = require("../../utils/meteredQuota");
const { buildTtsQuotaSpec, resolveCurrentMonthKey } = require("./quota");
const { sendTextToChirpSynthesizer } = require("./api");
const { CHIRP_TTS_GLOBAL_LIMIT, CHIRP_TTS_USER_LIMIT, CHIRP_TTS_PREMIUM_USER_LIMIT } = require("../../utils/constants");

/**
 * Synthesizes `text` under the monthly voice quota.
 *
 * The quota is reserved before the call and refunded if it fails, so a user is
 * never charged for audio they did not receive. Quota errors keep the
 * GLOBAL_QUOTA_EXCEEDED / USER_QUOTA_EXCEEDED codes the route maps to 429.
 */
async function synthesizeWithQuota(db, uid, text, voiceId, rate, pitch) {
  const monthKey = resolveCurrentMonthKey();
  const spec = buildTtsQuotaSpec(db, uid, monthKey, text.length);

  return runMeteredCall(db, spec, () =>
    sendTextToChirpSynthesizer(text, voiceId, rate, pitch)
  );
}

module.exports = {
  synthesizeWithQuota,
  sendTextToChirpSynthesizer,
  CHIRP_TTS_GLOBAL_LIMIT,
  CHIRP_TTS_USER_LIMIT,
  CHIRP_TTS_PREMIUM_USER_LIMIT,
};
