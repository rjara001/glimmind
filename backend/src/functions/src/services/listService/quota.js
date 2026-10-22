const { QuotaService } = require("../quotaService");
const { QUOTA_CONFIG, getMaxDecks } = require("../../utils/quotaConfig");
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

// The deck-count guard, same contract as assertCardQuotaHasRoom: it lives
// inside the caller's transaction, only growth is bounded, and the figure it
// reads is authoritative only while the transaction holds. A single-word deck
// never touches the card quota, so without this a user could create thousands
// of decks (docs/issues/done/2026-10-12-sin-tope-de-mazos-por-usuario.md).
function assertDeckQuotaHasRoom(tier, currentDeckCount, newDecksCount) {
  if (!(newDecksCount > 0)) return;
  if (QuotaService.canAddDecks(currentDeckCount, newDecksCount, tier)) return;

  const maxDecks = getMaxDecks(tier);
  throw new QuotaExceededError(`Llegaste a tu límite de ${maxDecks} mazos. Elimina o archiva mazos para crear más.`);
}

// Legacy metas (written before maxDecks existed) carry no listCount. Firestore
// transactions cannot run queries, so the real figure is resolved here, before
// the transaction, and written back absolutely on the first write; from that
// point on the counter is maintained inside the transaction like cardCount.
// docs/issues/done/2026-10-12-sin-tope-de-mazos-por-usuario.md
async function resolveListCount(db, userId) {
  const { COLLECTION_NAME } = require("../../utils/constants");
  const listsSnap = await db.collection(COLLECTION_NAME).where("userId", "==", userId).get();
  return Array.isArray(listsSnap.docs) ? listsSnap.docs.length : 0;
}

module.exports = {
  resolveListCardLimit,
  validateListDoesNotExceedCardLimit,
  loadUserMetaForCardQuota,
  validateUserCardQuotaNotExceeded,
  assertCardQuotaHasRoom,
  assertDeckQuotaHasRoom,
  resolveListCount,
};
