const { QUOTA_CONFIG, getMaxCards, getAiDailyLimit, getStatus, canAddCards, canUseAI, getEffectiveQuota, resolveTier } = require('../utils/quotaConfig');

class QuotaService {
  static getMaxCards(tier = 'free') {
    return getMaxCards(tier);
  }

  static getAiDailyLimit(tier = 'free') {
    return getAiDailyLimit(tier);
  }

  static getStatus(currentCards, tier = 'free') {
    return getStatus(currentCards, tier);
  }

  static canAddCards(currentCards, cardsToAdd, tier = 'free') {
    return canAddCards(currentCards, cardsToAdd, tier);
  }

  static canUseAI(currentCards, tier = 'free') {
    return canUseAI(currentCards, tier);
  }

  static getEffectiveQuota(currentCards, tier = 'free') {
    return getEffectiveQuota(currentCards, tier);
  }
}

module.exports = { QuotaService };
