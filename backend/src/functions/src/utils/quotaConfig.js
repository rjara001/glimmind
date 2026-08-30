const QUOTA_CONFIG = {
  tiers: {
    free: {
      maxCards: 1000,
      aiDailyLimit: 100,
    },
    premium: {
      maxCards: 5000,
      aiDailyLimit: 1000,
    },
  },
  thresholds: {
    warningRatio: 0.80,
    dangerRatio: 0.95,
    blockRatio: 1.00,
  },
  maxCardsPerList: 5000,
};

const TIER_TYPE = Object.freeze(['free', 'premium']);
const QUOTA_LEVEL = Object.freeze(['ok', 'warning', 'danger', 'blocked']);

function resolveTier(tier) {
  return TIER_TYPE.includes(tier) ? tier : 'free';
}

function getMaxCards(tier) {
  const resolved = resolveTier(tier);
  return QUOTA_CONFIG.tiers[resolved].maxCards;
}

function getAiDailyLimit(tier) {
  const resolved = resolveTier(tier);
  return QUOTA_CONFIG.tiers[resolved].aiDailyLimit;
}

function getStatus(currentCards, tier) {
  const maxCards = getMaxCards(tier);
  const usageRatio = currentCards / maxCards;
  const percentage = Math.round(usageRatio * 100);

  let level = 'ok';
  if (usageRatio >= QUOTA_CONFIG.thresholds.blockRatio) {
    level = 'blocked';
  } else if (usageRatio >= QUOTA_CONFIG.thresholds.dangerRatio) {
    level = 'danger';
  } else if (usageRatio >= QUOTA_CONFIG.thresholds.warningRatio) {
    level = 'warning';
  }

  return {
    currentCards,
    maxCards,
    usageRatio,
    percentage,
    level,
    isAiBlocked: level === 'danger' || level === 'blocked',
    isManualBlocked: level === 'blocked',
    remainingCards: Math.max(0, maxCards - currentCards),
  };
}

function canAddCards(currentCards, cardsToAdd, tier) {
  const maxCards = getMaxCards(tier);
  return (currentCards + cardsToAdd) <= maxCards;
}

function canUseAI(currentCards, tier) {
  const status = getStatus(currentCards, tier);
  return !status.isAiBlocked;
}

function getEffectiveQuota(currentCards, tier) {
  const maxCards = getMaxCards(tier);
  if (tier === 'free' && currentCards > maxCards) {
    return Math.max(maxCards, currentCards);
  }
  return maxCards;
}

module.exports = {
  QUOTA_CONFIG,
  TIER_TYPE,
  QUOTA_LEVEL,
  resolveTier,
  getMaxCards,
  getAiDailyLimit,
  getStatus,
  canAddCards,
  canUseAI,
  getEffectiveQuota,
};
