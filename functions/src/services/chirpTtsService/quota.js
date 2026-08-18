const { getDb } = require("../../utils/firebase");
const { CHIRP_TTS_GLOBAL_LIMIT, CHIRP_TTS_USER_LIMIT, CHIRP_TTS_PREMIUM_USER_LIMIT } = require("../../utils/constants");

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

module.exports = {
  resolveCurrentMonthKey,
  buildTtsQuotaDocumentRefs,
  fetchTtsQuotaDocuments,
  assertGlobalTtsQuotaHasCapacity,
  assertUserTtsQuotaHasCapacity,
  persistTtsQuotaUsage,
};
