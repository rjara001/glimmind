// Applies client progress deltas to a list's `associations`.
//
// Firestore must never receive partial dotted updates on `associations`
// (for example `associations.<uuid>.hits = 1`): association ids are UUIDs, and
// a non-numeric key replaces the whole array with a map keyed by that id,
// destroying term/definition (see docs/issues/P0/2026-10-15-updateListFields-corrompe-associations.md).
// The array is read inside the transaction, the deltas are applied in memory,
// and the full array is written back.

function normalizeAssociationsToList(associations) {
  if (Array.isArray(associations)) {
    return associations;
  }
  if (associations && typeof associations === "object") {
    return Object.entries(associations).map(([key, value]) => {
      const entry = value && typeof value === "object" ? { ...value } : {};
      if (!entry.id) {
        entry.id = key;
      }
      return entry;
    });
  }
  return [];
}

function applyDeltasToList(associations, deltas) {
  const list = normalizeAssociationsToList(associations);
  const fieldsById = new Map();
  for (const delta of deltas || []) {
    if (!delta || !delta.id || !delta.fields) {
      continue;
    }
    const merged = fieldsById.get(delta.id) || {};
    Object.assign(merged, delta.fields);
    fieldsById.set(delta.id, merged);
  }
  return list.map((association) => {
    const fields = fieldsById.get(association.id);
    if (!fields) {
      return association;
    }
    return { ...association, ...fields };
  });
}

module.exports = {
  applyDeltasToList,
  normalizeAssociationsToList,
};
