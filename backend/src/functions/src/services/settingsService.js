const { FieldValue } = require("../utils/firebase");

async function loadUserSettings(db, userId) {
  const doc = await db.collection("users").doc(userId).collection("settings").doc("main").get();
  if (!doc.exists) {
    return null;
  }
  return doc.data();
}

async function persistUserSettings(db, userId, settings) {
  await db.collection("users").doc(userId).collection("settings").doc("main").set({
    ...settings,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
}

module.exports = {
  loadUserSettings,
  persistUserSettings,
};
