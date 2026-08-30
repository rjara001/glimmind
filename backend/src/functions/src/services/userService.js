const { getOrCreateMeta, metaDefaults } = require("../utils/helpers");
const { QuotaService } = require("./quotaService");
const { TRANSLATION_USER_MONTHLY_CHARS, TRANSLATION_PREMIUM_USER_MONTHLY_CHARS } = require("../utils/constants");

async function getQuota(db, userId) {
  const { data } = await getOrCreateMeta(db, userId);

  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const translationUserRef = db.collection("users").doc(userId).collection("usage").doc(`translation_${monthKey}`);
  const translationSnap = await translationUserRef.get();
  const translationData = translationSnap.exists ? translationSnap.data() : { charactersTranslated: 0 };

  const translationCharLimit = data.tier === "premium"
    ? TRANSLATION_PREMIUM_USER_MONTHLY_CHARS
    : TRANSLATION_USER_MONTHLY_CHARS;

  const ytAiDailyLimit = QuotaService.getAiDailyLimit(data.tier);

  return {
    tier: data.tier,
    cardCount: data.cardCount,
    cardQuota: data.cardQuota,
    aiQuotaDaily: data.aiQuotaDaily,
    aiUsedToday: data.aiUsedToday,
    ytAiUsedToday: data.ytAiUsedToday || 0,
    ytAiDailyLimit,
    translationCharsUsed: translationData.charactersTranslated || 0,
    translationCharLimit,
  };
}

async function setUserQuota(db, adminUid, uid, tier) {
  const cardQuota = QuotaService.getMaxCards(tier);
  const aiQuotaDaily = QuotaService.getAiDailyLimit(tier);

  const { ref } = await getOrCreateMeta(db, uid);
  await ref.update({
    tier,
    cardQuota,
    aiQuotaDaily,
    updatedAt: require("../utils/firebase").FieldValue.serverTimestamp(),
  });
  return { success: true, tier, cardQuota, aiQuotaDaily };
}

async function setUserPremium(db, uid) {
  const cardQuota = QuotaService.getMaxCards('premium');
  const aiQuotaDaily = QuotaService.getAiDailyLimit('premium');

  const { ref } = await getOrCreateMeta(db, uid);
  await ref.update({
    tier: "premium",
    cardQuota,
    aiQuotaDaily,
    updatedAt: require("../utils/firebase").FieldValue.serverTimestamp(),
  });
  return { success: true, tier: "premium", cardQuota, aiQuotaDaily };
}

module.exports = {
  getQuota,
  setUserQuota,
  setUserPremium,
};
