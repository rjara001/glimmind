const { getOrCreateMeta, metaDefaults } = require("../utils/helpers");
const { DEFAULT_CARD_QUOTA, DEFAULT_AI_DAILY_QUOTA, PREMIUM_CARD_QUOTA, PREMIUM_AI_DAILY_QUOTA } = require("../utils/constants");

async function getQuota(db, userId) {
  const { data } = await getOrCreateMeta(db, userId);
  return {
    tier: data.tier,
    cardCount: data.cardCount,
    cardQuota: data.cardQuota,
    aiQuotaDaily: data.aiQuotaDaily,
    aiUsedToday: data.aiUsedToday,
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
