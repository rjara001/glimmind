const { getDb } = require("../utils/firebase");
const { FieldValue } = require("../utils/firebase");
const { todayKey } = require("../utils/helpers");
const { CHIRP_TTS_GLOBAL_LIMIT, CHIRP_TTS_USER_LIMIT, CHIRP_TTS_PREMIUM_USER_LIMIT, CHIRP_TTS_CALL_TIMEOUT_MS, GOOGLE_TTS_URL } = require("../utils/constants");
const { sendAuthenticatedRequest } = require("../utils/googleApiClient");

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getQuotaDoc(db, path) {
  const ref = db.doc(path);
  const snap = await ref.get();
  const currentMonth = monthKey();

  if (snap.exists) {
    const data = snap.data();
    if (data.monthKey !== currentMonth) {
      return { ref, data: { monthKey: currentMonth, charsUsed: 0 } };
    }
    return { ref, data };
  }

  return { ref, data: { monthKey: currentMonth, charsUsed: 0 } };
}

async function checkAndIncrementQuota(db, uid, charCount) {
  const currentMonth = monthKey();

  const globalRef = db
    .collection("usage")
    .doc("chirpTts")
    .collection("global")
    .doc(currentMonth);

  const userRef = db
    .collection("usage")
    .doc("chirpTts")
    .collection("users")
    .doc(uid)
    .collection("months")
    .doc(currentMonth);

  const [globalSnap, userSnap] = await Promise.all([
    globalRef.get(),
    userRef.get(),
  ]);

  const globalData = globalSnap.exists
    ? globalSnap.data()
    : { monthKey: currentMonth, charsUsed: 0 };

  const userData = userSnap.exists
    ? userSnap.data()
    : { monthKey: currentMonth, charsUsed: 0 };

  if (globalData.charsUsed >= CHIRP_TTS_GLOBAL_LIMIT) {
    const error = new Error(
      "El servicio de voz alcanzó su límite mensual global. Intenta el próximo mes."
    );
    error.code = "GLOBAL_QUOTA_EXCEEDED";
    throw error;
  }

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

  const batch = db.batch();

  batch.set(
    globalRef,
    {
      monthKey: currentMonth,
      charsUsed: globalData.charsUsed + charCount,
    },
    { merge: true }
  );

  batch.set(
    userRef,
    {
      monthKey: currentMonth,
      charsUsed: userData.charsUsed + charCount,
    },
    { merge: true }
  );

  await batch.commit();
}

async function callGoogleTts(text, voiceId, rate, pitch) {
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
  checkAndIncrementQuota,
  callGoogleTts,
  getQuotaDoc,
  CHIRP_TTS_GLOBAL_LIMIT,
  CHIRP_TTS_USER_LIMIT,
  CHIRP_TTS_PREMIUM_USER_LIMIT,
};
