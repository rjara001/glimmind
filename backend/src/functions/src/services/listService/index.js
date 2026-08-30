const { getDb } = require("../../utils/firebase");
const { requireAuth } = require("../../utils/helpers");
const { QuotaExceededError } = require("../../utils/helpers");
const { COLLECTION_NAME, MAX_CARDS_PER_LIST } = require("../../utils/constants");
const { fetchAllListsForUser, fetchListByIdForUser, persistNewListWithAssociations, applyUpdatesToListAndAdjustCardCounters, removeListAndDecrementUserCardCount, divideOriginalListIntoGroupsAndReplaceIt } = require("./crud");

module.exports = {
  fetchAllListsForUser,
  fetchListByIdForUser,
  persistNewListWithAssociations,
  applyUpdatesToListAndAdjustCardCounters,
  removeListAndDecrementUserCardCount,
  divideOriginalListIntoGroupsAndReplaceIt,
};
