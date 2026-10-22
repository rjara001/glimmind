const PLANS = require("../config/plans.json");

// Single source of truth for plan limits. Values live in config/plans.json so
// they can be tuned without editing code.
//
// NOTE: src/config/plans.json must stay byte-identical to
// backend/src/functions/src/config/plans.json. The two build pipelines cannot
// share one file (Firebase only deploys backend/src/functions/, and vite.config.ts
// sets root to src/), so tests/config/plansDrift.test.ts fails when they diverge.

const TIER_TYPE = Object.freeze(Object.keys(PLANS.tiers));
const QUOTA_LEVEL = Object.freeze(["ok", "warning", "danger", "blocked"]);

function resolveTier(tier) {
  return TIER_TYPE.includes(tier) ? tier : "free";
}

function getTierConfig(tier) {
  return PLANS.tiers[resolveTier(tier)];
}

function getMaxCards(tier) {
  return getTierConfig(tier).maxCards;
}

function getMaxDecks(tier) {
  return getTierConfig(tier).maxDecks;
}

function getAiDailyLimit(tier) {
  return getTierConfig(tier).aiDailyLimit;
}

function getTierLabel(tier) {
  return getTierConfig(tier).label;
}

function getStatus(currentCards, tier) {
  const maxCards = getMaxCards(tier);
  const usageRatio = currentCards / maxCards;
  const percentage = Math.round(usageRatio * 100);

  let level = "ok";
  if (usageRatio >= PLANS.thresholds.blockRatio) {
    level = "blocked";
  } else if (usageRatio >= PLANS.thresholds.dangerRatio) {
    level = "danger";
  } else if (usageRatio >= PLANS.thresholds.warningRatio) {
    level = "warning";
  }

  return {
    currentCards,
    maxCards,
    usageRatio,
    percentage,
    level,
    isAiBlocked: level === "danger" || level === "blocked",
    isManualBlocked: level === "blocked",
    remainingCards: Math.max(0, maxCards - currentCards),
  };
}

function canAddCards(currentCards, cardsToAdd, tier) {
  const maxCards = getMaxCards(tier);
  return currentCards + cardsToAdd <= maxCards;
}

function canAddDecks(currentDecks, decksToAdd, tier) {
  const maxDecks = getMaxDecks(tier);
  return currentDecks + decksToAdd <= maxDecks;
}

function canUseAI(currentCards, tier) {
  return !getStatus(currentCards, tier).isAiBlocked;
}

function getEffectiveQuota(currentCards, tier) {
  const maxCards = getMaxCards(tier);
  if (tier === "free" && currentCards > maxCards) {
    return Math.max(maxCards, currentCards);
  }
  return maxCards;
}

module.exports = {
  PLANS,
  QUOTA_CONFIG: PLANS,
  TIER_TYPE,
  QUOTA_LEVEL,
  resolveTier,
  getTierConfig,
  getTierLabel,
  getMaxCards,
  getMaxDecks,
  getAiDailyLimit,
  getStatus,
  canAddCards,
  canAddDecks,
  canUseAI,
  getEffectiveQuota,
};