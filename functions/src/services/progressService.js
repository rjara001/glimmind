const { FieldValue } = require("../utils/firebase");

async function loadUserLearningProgress(db, userId) {
  const doc = await db.collection("users").doc(userId).collection("progress").doc("main").get();
  if (!doc.exists) {
    return null;
  }
  return doc.data();
}

async function persistUserLearningProgress(db, userId, progress) {
  await db.collection("users").doc(userId).collection("progress").doc("main").set({
    ...progress,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
}

module.exports = {
  loadUserLearningProgress,
  persistUserLearningProgress,
};
