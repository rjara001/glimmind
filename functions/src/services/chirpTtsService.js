const { getDb } = require("../utils/firebase");
const { FieldValue } = require("../utils/firebase");
const { todayKey } = require("../utils/helpers");
const { CHIRP_TTS_GLOBAL_LIMIT, CHIRP_TTS_USER_LIMIT, CHIRP_TTS_PREMIUM_USER_LIMIT, CHIRP_TTS_CALL_TIMEOUT_MS, GOOGLE_TTS_URL } = require("../utils/constants");
const { sendAuthenticatedRequest } = require("../utils/googleApiClient");

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

async function fetchTtsQuotaDocuments(db, uid, monthKey) {
  const { globalRef, userRef } = buildTtsQuotaDocumentRefs(db, uid, monthKey);
  const [globalSnap, userSnap] = await Promise.all([
    globalRef.get(),
    userRef.get(),
  ]);

  const globalData = globalSnap.exists
    ? globalSnap.data()
    : { monthKey: monthKey, charsUsed: 0 };

  const userData = userSnap.exists
    ? userSnap.data()
    : { monthKey: monthKey, charsUsed: 0 };

  return { globalRef, userRef, globalData, userData };
}

function assertGlobalTtsQuotaHasCapacity(globalData, charCount) {
  if (globalData.charsUsed >= CHIRP_TTS_GLOBAL_LIMIT) {
    const error = new Error(
      "El servicio de voz alcanzó su límite mensual global. Intenta el próximo mes."
    );
    error.code = "GLOBAL_QUOTA_EXCEEDED";
    throw error;
  }
}

async function assertUserTtsQuotaHasCapacity(db, uid, userData, charCount) {
  const metaRef = db.collection("users").doc(uid).collection("meta").doc("main");
  const metaSnap = await metaRef.get();
  const userTier = metaSnap.exists ? (metaSnap.data().tier || 'free') : 'free';
  const userLimit = userTier === 'premium' ? CHIRP_TTS_PREMIUM_USER_LIMIT : CHIRP_TTS_USER_LIMIT;

  if (userData.charsUsed >= userLimit) {
    const error = new Error(
      `Llegaste a tu límite mensual de voz (${userLimit} caracteres). Vuelve el próximo mes.`
    );
    error.code = "USER_QUOTA_EXCEEDED";
    throw error;
  }
}

async function persistTtsQuotaUsage(db, globalRef, userRef, globalData, userData, charCount, monthKey) {
  const batch = db.batch();

  batch.set(
    globalRef,
    {
      monthKey: monthKey,
      charsUsed: globalData.charsUsed + charCount,
    },
    { merge: true }
  );

  batch.set(
    userRef,
    {
      monthKey: monthKey,
      charsUsed: userData.charsUsed + charCount,
    },
    { merge: true }
  );

  await batch.commit();
}

async function verifyUserHasRemainingTtsQuota(db, uid, charCount) {
  const monthKey = resolveCurrentMonthKey();
  const { globalRef, userRef, globalData, userData } = await fetchTtsQuotaDocuments(db, uid, monthKey);
  assertGlobalTtsQuotaHasCapacity(globalData, charCount);
  await assertUserTtsQuotaHasCapacity(db, uid, userData, charCount);
  await persistTtsQuotaUsage(db, globalRef, userRef, globalData, userData, charCount, monthKey);
}

async function sendTextToChirpSynthesizer(text, voiceId, rate, pitch) {
  const parts = String(voiceId).split("-");
  const languageCode =
    parts.length >= 2 ? `${parts[0]}-${parts[1]}` : parts[0] || "es";

  const audioConfig = {
    audioEncoding: "MP3",
    speakingRate: typeof rate === "number" ? rate : 1,
  };

  const data = await sendAuthenticatedRequest(
    GOOGLE_TTS_URL,
    {
      input: { text: String(text) },
      voice: { languageCode, name: String(voiceId) },
      audioConfig,
    },
    CHIRP_TTS_CALL_TIMEOUT_MS,
    (data) => {
      if (!data.audioContent) {
        const error = new Error("Respuesta vacía de TTS.");
        error.code = "TTS_ERROR";
        return error;
      }
      return null;
    }
  );

  return data.audioContent;
}

module.exports = {
  verifyUserHasRemainingTtsQuota,
  sendTextToChirpSynthesizer,
  CHIRP_TTS_GLOBAL_LIMIT,
  CHIRP_TTS_USER_LIMIT,
  CHIRP_TTS_PREMIUM_USER_LIMIT,
};
