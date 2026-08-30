const { QuotaService } = require("../quotaService");
const { QUOTA_CONFIG } = require("../../utils/quotaConfig");

function resolveListCardLimit(tier) {
  const isPremium = tier === "premium";
  const maxAllowed = isPremium ? Infinity : QUOTA_CONFIG.maxCardsPerList;
  return { isPremium, maxAllowed };
}

function validateListDoesNotExceedCardLimit(associations, maxAllowed) {
  const count = Array.isArray(associations) ? associations.length : 0;
  if (count > maxAllowed) {
    throw new QuotaExceededError(`Una lista no puede superar ${maxAllowed} tarjetas.`);
  }
  return count;
}

async function loadUserMetaForCardQuota(db, userId) {
  const { getOrCreateMeta, metaRefFor } = require("../../utils/helpers");
  await getOrCreateMeta(db, userId);
  const metaSnap = await metaRefFor(db, userId).get();
  const meta = metaSnap.exists ? metaSnap.data() : { tier: "free" };
  return meta;
}

function validateUserCardQuotaNotExceeded(meta, newCardsCount) {
  const tier = meta.tier || "free";
  const effectiveQuota = QuotaService.getEffectiveQuota(meta.cardCount || 0, tier);
  const cardCount = meta.cardCount || 0;
  const isPremium = tier === "premium";

  if (!isPremium && newCardsCount > 0 && cardCount + newCardsCount > effectiveQuota) {
    throw new QuotaExceededError(`Llegaste a tu límite de ${effectiveQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
  }
  return { cardQuota: effectiveQuota, cardCount, isPremium };
}

module.exports = {
  resolveListCardLimit,
  validateListDoesNotExceedCardLimit,
  loadUserMetaForCardQuota,
  validateUserCardQuotaNotExceeded,
};
