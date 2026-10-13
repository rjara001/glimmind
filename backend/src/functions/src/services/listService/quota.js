const { QuotaService } = require("../quotaService");
const { QUOTA_CONFIG } = require("../../utils/quotaConfig");
const { QuotaExceededError } = require("../../utils/helpers");

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

// The single card-count guard shared by createList, updateList and splitList.
// It has to live inside each caller's transaction: the figure it reads is only
// authoritative while the transaction holds, which is what stops two concurrent
// edits from both reading 4100 and both landing.
//
// A non-positive delta is a removal. Checking it would lock a user who is
// already over their ceiling out of ever deleting cards to get back under it,
// so only growth is bounded.
function assertCardQuotaHasRoom(tier, currentCardCount, newCardsCount) {
  if (!(newCardsCount > 0)) return;
  if (QuotaService.canAddCards(currentCardCount, newCardsCount, tier)) return;

  const effectiveQuota = QuotaService.getEffectiveQuota(currentCardCount, tier);
  throw new QuotaExceededError(`Llegaste a tu límite de ${effectiveQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
}

module.exports = {
  resolveListCardLimit,
  validateListDoesNotExceedCardLimit,
  loadUserMetaForCardQuota,
  validateUserCardQuotaNotExceeded,
  assertCardQuotaHasRoom,
};
