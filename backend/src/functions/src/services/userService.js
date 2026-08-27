const { getOrCreateMeta, metaDefaults } = require("../utils/helpers");
const { DEFAULT_CARD_QUOTA, DEFAULT_AI_DAILY_QUOTA, PREMIUM_CARD_QUOTA, PREMIUM_AI_DAILY_QUOTA, TRANSLATION_USER_MONTHLY_CHARS, TRANSLATION_PREMIUM_USER_MONTHLY_CHARS, YT_AI_DAILY_LIMIT_FREE, YT_AI_DAILY_LIMIT_PREMIUM } = require("../utils/constants");

async function getQuota(db, userId) {
  const { data } = await getOrCreateMeta(db, userId);

  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const translationUserRef = db.collection("users").doc(userId).collection("usage").doc(`translation_${monthKey}`);
  const translationSnap = await translationUserRef.get();
  const translationData = translationSnap.exists ? translationSnap.data() : { charactersTranslated: 0 };

  const translationCharLimit = data.tier === "premium"
    ? TRANSLATION_PREMIUM_USER_MONTHLY_CHARS
    : TRANSLATION_USER_MONTHLY_CHARS;

  const ytAiDailyLimit = data.tier === "premium"
    ? YT_AI_DAILY_LIMIT_PREMIUM
    : YT_AI_DAILY_LIMIT_FREE;

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
  const cardQuota = tier === "premium" ? PREMIUM_CARD_QUOTA : DEFAULT_CARD_QUOTA;
  const aiQuotaDaily = tier === "premium" ? PREMIUM_AI_DAILY_QUOTA : DEFAULT_AI_DAILY_QUOTA;

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
  const { ref } = await getOrCreateMeta(db, uid);
  await ref.update({
    tier: "premium",
    cardQuota: PREMIUM_CARD_QUOTA,
    aiQuotaDaily: PREMIUM_AI_DAILY_QUOTA,
    updatedAt: require("../utils/firebase").FieldValue.serverTimestamp(),
  });
  return { success: true, tier: "premium", cardQuota: PREMIUM_CARD_QUOTA, aiQuotaDaily: PREMIUM_AI_DAILY_QUOTA };
}

module.exports = {
  getQuota,
  setUserQuota,
  setUserPremium,
};
