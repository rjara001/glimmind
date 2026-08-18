const { getOrCreateMeta, metaDefaults, metaRefFor, QuotaExceededError } = require("../../utils/helpers");
const { DEFAULT_CARD_QUOTA, PREMIUM_CARD_QUOTA, MAX_CARDS_PER_LIST } = require("../../utils/constants");

function resolveListCardLimit(userTier) {
  const isPremium = userTier === "premium";
  const maxAllowed = isPremium ? PREMIUM_CARD_QUOTA : MAX_CARDS_PER_LIST;
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
  await getOrCreateMeta(db, userId);
  const metaSnap = await metaRefFor(db, userId).get();
  const meta = metaSnap.exists ? metaSnap.data() : metaDefaults();
  return meta;
}

function validateUserCardQuotaNotExceeded(meta, newCardsCount) {
  const cardQuota = meta.cardQuota || DEFAULT_CARD_QUOTA;
  const cardCount = meta.cardCount || 0;
  const { isPremium } = resolveListCardLimit(meta.tier);
  
  if (!isPremium && newCardsCount > 0 && cardCount + newCardsCount > cardQuota) {
    throw new QuotaExceededError(`Llegaste a tu límite de ${cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
  }
  return { cardQuota, cardCount, isPremium };
}

module.exports = {
  resolveListCardLimit,
  validateListDoesNotExceedCardLimit,
  loadUserMetaForCardQuota,
  validateUserCardQuotaNotExceeded,
};
