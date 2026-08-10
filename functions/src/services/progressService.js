async function getProgress(db, userId) {
  const doc = await db.collection("users").doc(userId).collection("progress").doc("main").get();
  if (!doc.exists) {
    return null;
  }
  return doc.data();
}

async function updateProgress(db, userId, progress) {
  await db.collection("users").doc(userId).collection("progress").doc("main").set({
    ...progress,
    updatedAt: require("../utils/firebase").FieldValue.serverTimestamp(),
  });
  return { success: true };
}

module.exports = {
  getProgress,
  updateProgress,
};
