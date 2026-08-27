const { getDb } = require("../utils/firebase");
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

async function fetchTranslationQuotaDocuments(db, uid, monthKey) {
  const { globalRef, userRef } = buildTranslationQuotaDocumentRefs(db, uid, monthKey);
  const [globalSnap, userSnap] = await Promise.all([globalRef.get(), userRef.get()]);

  const globalData = globalSnap.exists
    ? globalSnap.data()
    : { currentMonth: monthKey, totalCharactersTranslated: 0, totalCalls: 0 };

  const userData = userSnap.exists
    ? userSnap.data()
    : { userId: uid, currentMonth: monthKey, charactersTranslated: 0, callCount: 0 };

  return { globalRef, userRef, globalData, userData };
}

function assertGlobalTranslationQuotaHasCapacity(globalData, incomingChars) {
  const currentTotal = globalData.totalCharactersTranslated || 0;
  if (currentTotal + incomingChars > TRANSLATION_GLOBAL_MONTHLY_CHARS) {
    const error = new Error("Límite global mensual de traducción alcanzado.");
    error.code = "TRANSLATION_GLOBAL_QUOTA_EXCEEDED";
    throw error;
  }
}

async function assertUserTranslationQuotaHasCapacity(db, uid, userData, incomingChars) {
  const metaRef = db.collection("users").doc(uid).collection("meta").doc("main");
  const metaSnap = await metaRef.get();
  const userTier = metaSnap.exists ? metaSnap.data().tier || "free" : "free";
  const userLimit =
    userTier === "premium" ? TRANSLATION_PREMIUM_USER_MONTHLY_CHARS : TRANSLATION_USER_MONTHLY_CHARS;

  const currentUserTotal = userData.charactersTranslated || 0;
  if (currentUserTotal + incomingChars > userLimit) {
    const error = new Error(
      `Has alcanzado tu límite mensual de traducciones (${userLimit} caracteres).`
    );
    error.code = "TRANSLATION_USER_QUOTA_EXCEEDED";
    throw error;
  }

  return { userTier, userLimit };
}

async function persistTranslationQuotaUsage(
  db,
  globalRef,
  userRef,
  globalData,
  userData,
  incomingChars,
  monthKey
) {
  const batch = db.batch();

  batch.set(
    globalRef,
    {
      currentMonth: monthKey,
      totalCharactersTranslated: (globalData.totalCharactersTranslated || 0) + incomingChars,
      totalCalls: (globalData.totalCalls || 0) + 1,
    },
    { merge: true }
  );

  batch.set(
    userRef,
    {
      userId: userData.userId,
      currentMonth: monthKey,
      charactersTranslated: (userData.charactersTranslated || 0) + incomingChars,
      callCount: (userData.callCount || 0) + 1,
      lastTranslationAt: new Date(),
    },
    { merge: true }
  );

  await batch.commit();
}

module.exports = {
  resolveCurrentMonthKey,
  buildTranslationQuotaDocumentRefs,
  fetchTranslationQuotaDocuments,
  assertGlobalTranslationQuotaHasCapacity,
  assertUserTranslationQuotaHasCapacity,
  persistTranslationQuotaUsage,
};
