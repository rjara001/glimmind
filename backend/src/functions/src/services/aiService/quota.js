const { getDb } = require("../../utils/firebase");
const { GLOBAL_AI_DAILY_CAP, todayKey } = require("../../utils/helpers");

async function verifyGlobalAiQuotaNotExceeded(db) {
  const globalRef = db.collection("usage").doc("global");
  const today = todayKey();

  const globalSnap = await globalRef.get();
  const globalData = globalSnap.exists ? globalSnap.data() : { dateKey: today, aiCalls: 0 };
  const globalCalls = globalData.dateKey === today ? (globalData.aiCalls || 0) : 0;

  if (globalCalls >= GLOBAL_AI_DAILY_CAP) {
    return { error: "El servicio de IA alcanzó su límite diario. Intenta mañana.", status: 429, globalCalls };
  }

  return { globalCalls };
}

module.exports = {
  verifyGlobalAiQuotaNotExceeded,
};
