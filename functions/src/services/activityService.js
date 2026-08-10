const { MAX_EVENTS_PER_BATCH, MAX_ACTIVITY_PAGE, MAX_SESSIONS_PAGE } = require("../utils/constants");
const { toMillis } = require("../utils/helpers");

async function appendActivity(db, userId, events) {
  const activityCollection = db.collection("users").doc(userId).collection("activity");
  const batch = db.batch();
  for (const event of events) {
    const ref = event.id
      ? activityCollection.doc(event.id)
      : activityCollection.doc();
    batch.set(ref, {
      ...event,
      at: Number.isFinite(event.at) ? new Date(event.at) : require("../utils/firebase").FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return { success: true };
}

async function getActivity(db, userId, { cursor, limit = 50, type, listId }) {
  let query = db.collection("users").doc(userId).collection("activity");
  if (type) query = query.where("type", "==", type);
  if (listId) query = query.where("listId", "==", listId);
  query = query.orderBy("at", "desc").limit(Math.min(limit, MAX_ACTIVITY_PAGE));
  if (cursor) query = query.startAfter(new Date(cursor));

  const snapshot = await query.get();
  const events = snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, ...data, at: toMillis(data.at) };
  });
  const nextCursor = events.length > 0 ? events[events.length - 1].at : undefined;
  return { events, nextCursor };
}

async function saveSession(db, userId, session) {
  await db.collection("users").doc(userId).collection("sessions").doc(session.id).set({
    ...session,
    startedAt: new Date(session.startedAt),
    endedAt: new Date(session.endedAt),
  });
  return { success: true };
}

async function getSessions(db, userId) {
  const snapshot = await db.collection("users").doc(userId).collection("sessions")
    .orderBy("endedAt", "desc")
    .limit(MAX_SESSIONS_PAGE)
    .get();
  const sessions = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startedAt: toMillis(data.startedAt),
      endedAt: toMillis(data.endedAt),
    };
  });
  return sessions;
}

module.exports = {
  appendActivity,
  getActivity,
  saveSession,
  getSessions,
};
