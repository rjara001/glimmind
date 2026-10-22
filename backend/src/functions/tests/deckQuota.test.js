const { persistNewListWithAssociations, bulkCreateLists, removeListAndDecrementUserCardCount, divideOriginalListIntoGroupsAndReplaceIt } = require("../src/services/listService/crud");
const { assertDeckQuotaHasRoom, resolveListCount } = require("../src/services/listService/quota");
const { getMaxDecks } = require("../src/utils/quotaConfig");
const { QuotaExceededError, metaDefaults } = require("../src/utils/helpers");

// Deck ceiling (maxDecks: free 50, premium 200). A single-word deck never
// touches the card quota, so before this guard a user could create 10000
// decks while staying inside every other limit
// (docs/issues/done/2026-10-12-sin-tope-de-mazos-por-usuario.md).

function makeAssociations(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `a${i}`,
    term: `t${i}`,
    definition: ["d"],
    currentCycle: 1,
    status: "pending",
    isLearned: false,
    isArchived: false,
  }));
}

function fakeDb({ meta, decks = [] } = {}) {
  const state = { listSets: [], metaUpdates: [], metaSets: [], deckDeletes: [] };
  let docSeq = 0;
  const deckStore = new Map(decks.map((deck, i) => [`deck-${i + 1}`, deck]));

  const isIncrement = (value) =>
    typeof value === "object" && value !== null && "operand" in value && typeof value.operand === "number";

  const materialise = (fields, base) => {
    const out = { ...fields };
    for (const [key, value] of Object.entries(fields)) {
      if (isIncrement(value)) out[key] = Number(base?.[key] ?? 0) + value.operand;
    }
    return out;
  };

  const metaRef = {
    _isMeta: true,
    get: async () => ({ exists: meta !== undefined, data: () => meta }),
    set: async (data) => {
      meta = materialise(data, meta);
    },
    update: async (data) => {
      // Firestore update() merges fields; only materialised writes replace.
      meta = { ...(meta ?? {}), ...materialise(data, meta) };
    },
  };

  const deckRef = (id) => ({
    id,
    get: async () => ({ exists: deckStore.has(id), data: () => deckStore.get(id) }),
    set: async (data) => deckStore.set(id, data),
  });

  const listsCollection = {
    doc: (id) => {
      if (id !== undefined) return deckRef(id);
      docSeq += 1;
      return deckRef(`deck-${docSeq + decks.length}`);
    },
    where: (field, op, value) => ({
      get: async () => {
        if (op !== "==") throw new Error(`unsupported operator ${op}`);
        const docs = [...deckStore.entries()]
          .filter(([, data]) => data[field] === value)
          .map(([id, data]) => ({ id, data: () => data }));
        return { docs };
      },
    }),
  };

  const db = {
    collection: (name) => {
      if (name === "users") {
        return { doc: () => ({ collection: () => ({ doc: () => metaRef }) }) };
      }
      if (name === "lists") return listsCollection;
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => {
          if (ref._isMeta) return { exists: meta !== undefined, data: () => meta };
          const data = deckStore.get(ref.id);
          return { exists: data !== undefined, data: () => data };
        },
        set: (ref, data) => {
          if (ref._isMeta) {
            meta = materialise(data, meta);
            state.metaSets.push(data);
            return;
          }
          deckStore.set(ref.id, data);
          state.listSets.push({ ref, data });
        },
        update: (ref, data) => {
          if (ref._isMeta) {
            meta = { ...(meta ?? {}), ...materialise(data, meta) };
            state.metaUpdates.push(data);
            return;
          }
          const base = deckStore.get(ref.id) ?? {};
          deckStore.set(ref.id, { ...base, ...materialise(data, base) });
        },
        delete: (ref) => {
          deckStore.delete(ref.id);
          state.deckDeletes.push(ref.id);
        },
      };
      return fn(tx);
    },
  };

  return { db, state, deckStore, getMeta: () => meta };
}

describe("deck quota guard", () => {
  test("maxDecks comes from plans.json (free 50, premium 200)", () => {
    expect(getMaxDecks("free")).toBe(50);
    expect(getMaxDecks("premium")).toBe(200);
    expect(getMaxDecks("unknown")).toBe(50);
  });

  test("throws QuotaExceededError naming the tier ceiling", () => {
    expect(() => assertDeckQuotaHasRoom("free", 50, 1)).toThrow(QuotaExceededError);
    expect(() => assertDeckQuotaHasRoom("free", 50, 1)).toThrow(/límite de 50 mazos/);
    expect(() => assertDeckQuotaHasRoom("premium", 200, 1)).toThrow(/límite de 200 mazos/);
    expect(() => assertDeckQuotaHasRoom("premium", 199, 1)).not.toThrow();
    expect(() => assertDeckQuotaHasRoom("free", 49, 1)).not.toThrow();
  });

  test("is a no-op for a non-positive delta, so deleting never gets blocked", () => {
    expect(() => assertDeckQuotaHasRoom("free", 9000, 0)).not.toThrow();
    expect(() => assertDeckQuotaHasRoom("free", 9000, -3)).not.toThrow();
  });
});

describe("createList deck ceiling", () => {
  test("refuses the 51st free deck", async () => {
    const { db, state } = fakeDb({ meta: { tier: "free", cardCount: 0, listCount: 50 } });

    await expect(
      persistNewListWithAssociations(db, "user-1", {
        name: "D",
        concept: "x",
        associations: makeAssociations(1),
        settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
      })
    ).rejects.toBeInstanceOf(QuotaExceededError);

    expect(state.listSets).toHaveLength(0);
    expect(state.metaUpdates).toHaveLength(0);
  });

  test("accepts the 50th free deck (inclusive bound) and increments listCount", async () => {
    const { db, state, getMeta } = fakeDb({ meta: { tier: "free", cardCount: 0, listCount: 49 } });

    const { id } = await persistNewListWithAssociations(db, "user-1", {
      name: "D",
      concept: "x",
      associations: makeAssociations(1),
      settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
    });

    expect(id).toBeTruthy();
    expect(state.metaUpdates[0].listCount.operand).toBe(1);
    expect(getMeta().listCount).toBe(50);
  });

  test("refuses a premium user past 200 decks", async () => {
    const { db } = fakeDb({ meta: { tier: "premium", cardCount: 0, listCount: 200 } });

    await expect(
      persistNewListWithAssociations(db, "user-1", {
        name: "D",
        concept: "x",
        associations: [],
        settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
      })
    ).rejects.toThrow(/límite de 200 mazos/);
  });

  test("backfills a legacy meta without listCount from the real deck count", async () => {
    // Meta written before maxDecks existed: no listCount field at all. The
    // guard must count the decks the user actually owns, not start from 0.
    const { db, state, getMeta } = fakeDb({
      meta: { tier: "free", cardCount: 0 },
      decks: Array.from({ length: 50 }, (_, i) => ({
        userId: "user-1",
        name: `legacy-${i}`,
        associations: [],
      })),
    });

    await expect(
      persistNewListWithAssociations(db, "user-1", {
        name: "D",
        concept: "x",
        associations: [],
        settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
      })
    ).rejects.toThrow(/límite de 50 mazos/);

    expect(state.listSets).toHaveLength(0);
    expect(getMeta().listCount).toBeUndefined();
  });

  test("backfilled legacy meta gets one absolute listCount write, not an increment from 0", async () => {
    const { db, getMeta } = fakeDb({
      meta: { tier: "free", cardCount: 0 },
      decks: Array.from({ length: 10 }, (_, i) => ({
        userId: "user-1",
        name: `legacy-${i}`,
        associations: [],
      })),
    });

    await persistNewListWithAssociations(db, "user-1", {
      name: "D",
      concept: "x",
      associations: [],
      settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
    });

    expect(getMeta().listCount).toBe(11);
  });
});

describe("bulkCreateLists deck ceiling", () => {
  test("counts every chunk of the import against the ceiling", async () => {
    // 250 cards -> 3 decks; 49 + 3 = 52 > 50 must be refused atomically.
    const { db, state } = fakeDb({ meta: { tier: "free", cardCount: 0, listCount: 49 } });

    await expect(
      bulkCreateLists(db, "user-1", {
        name: "Bulk",
        concept: "x",
        associations: makeAssociations(250),
        settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
      })
    ).rejects.toThrow(/límite de 50 mazos/);

    expect(state.listSets).toHaveLength(0);
    expect(state.metaUpdates).toHaveLength(0);
  });

  test("accepts an import that lands exactly on the ceiling", async () => {
    const { db, state, getMeta } = fakeDb({ meta: { tier: "free", cardCount: 0, listCount: 47 } });

    await bulkCreateLists(db, "user-1", {
      name: "Bulk",
      concept: "x",
      associations: makeAssociations(250),
      settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
    });

    expect(state.listSets).toHaveLength(3);
    expect(getMeta().listCount).toBe(50);
  });
});

describe("splitList deck ceiling", () => {
  test("counts only the new decks groups[1..] creates", async () => {
    // 3 groups = 1 rewrite + 2 new decks; 49 + 2 = 51 > 50.
    const { db, state } = fakeDb({ meta: { tier: "free", cardCount: 6, listCount: 49 } });
    await db.collection("lists").doc("orig").set({
      userId: "user-1",
      name: "orig",
      associations: makeAssociations(6),
    });

    await expect(
      divideOriginalListIntoGroupsAndReplaceIt(db, "orig", "user-1", [
        { name: "G1", associations: makeAssociations(2) },
        { name: "G2", associations: makeAssociations(2) },
        { name: "G3", associations: makeAssociations(2) },
      ])
    ).rejects.toThrow(/límite de 50 mazos/);

    expect(state.listSets).toHaveLength(0);
  });

  test("a single-group split creates no deck and is never blocked", async () => {
    const { db, getMeta } = fakeDb({ meta: { tier: "free", cardCount: 6, listCount: 50 } });
    await db.collection("lists").doc("orig").set({
      userId: "user-1",
      name: "orig",
      associations: makeAssociations(6),
    });

    await divideOriginalListIntoGroupsAndReplaceIt(db, "orig", "user-1", [
      { name: "G1", associations: makeAssociations(6) },
    ]);

    expect(getMeta().listCount).toBe(50);
  });
});

describe("deleteList keeps listCount in step", () => {
  test("decrements listCount together with cardCount", async () => {
    const { db, getMeta } = fakeDb({
      meta: { tier: "free", cardCount: 5, listCount: 3 },
      decks: [{ id: "deck-1", userId: "user-1", name: "d", associations: makeAssociations(5) }],
    });

    await removeListAndDecrementUserCardCount(db, "deck-1", "user-1");

    expect(getMeta().listCount).toBe(2);
    expect(getMeta().cardCount).toBe(0);
  });

  test("backfills listCount on delete for a legacy meta", async () => {
    const { db, getMeta } = fakeDb({
      meta: { tier: "free", cardCount: 5 },
      decks: [{ id: "deck-1", userId: "user-1", name: "d", associations: makeAssociations(5) }],
    });

    await removeListAndDecrementUserCardCount(db, "deck-1", "user-1");

    expect(getMeta().listCount).toBe(0);
  });

  test("never drives listCount below zero", async () => {
    const { db, getMeta } = fakeDb({
      meta: { tier: "free", cardCount: 0, listCount: 0 },
      decks: [{ id: "deck-1", userId: "user-1", name: "d", associations: [] }],
    });

    await removeListAndDecrementUserCardCount(db, "deck-1", "user-1");

    expect(getMeta().listCount).toBe(0);
  });
});

describe("listCount maintenance defaults", () => {
  test("metaDefaults starts listCount at 0", () => {
    expect(metaDefaults().listCount).toBe(0);
  });

  test("resolveListCount counts only the decks of that user", async () => {
    const { db } = fakeDb({
      meta: { tier: "free", cardCount: 0, listCount: 0 },
      decks: [
        { userId: "user-1", name: "a", associations: [] },
        { userId: "user-1", name: "b", associations: [] },
        { userId: "user-2", name: "c", associations: [] },
      ],
    });

    expect(await resolveListCount(db, "user-1")).toBe(2);
  });
});
