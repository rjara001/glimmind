async function getSettings(db, userId) {
  const doc = await db.collection("users").doc(userId).collection("settings").doc("main").get();
  if (!doc.exists) {
    return null;
  }
  return doc.data();
}

async function updateSettings(db, userId, settings) {
  await db.collection("users").doc(userId).collection("settings").doc("main").set({
    activityHistoryEnabled: settings.activityHistoryEnabled,
    updatedAt: require("../utils/firebase").FieldValue.serverTimestamp(),
  });
  return { success: true };
}

module.exports = {
  getSettings,
  updateSettings,
};
