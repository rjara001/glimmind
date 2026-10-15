const { bulkCreateLists } = require("../src/services/listService/crud");
const { QuotaExceededError } = require("../src/utils/helpers");
const { getMaxCards } = require("../src/utils/quotaConfig");

// bulkCreateLists persists every deck of an import plus the cardCount update
// in ONE transaction. The old client-side createList loop died at the 20/min
// rate limit (20 decks x 100 cards = 2000 cards) and could write a partial set
// of decks; here the import is atomic: all decks or none.

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

function fakeDb(meta) {
  const state = { listSets: [], metaUpdates: [], metaSets: [] };
  let docSeq = 0;

  const metaRef = {
    _isMeta: true,
    get: async () => ({ exists: !!meta, data: () => meta }),
    set: async () => undefined,
  };

  const db = {
    collection: (name) => {
      if (name === "users") {
        return { doc: () => ({ collection: () => ({ doc: () => metaRef }) }) };
      }
      if (name === "lists") {
        return {
          doc: (id) => {
            if (id !== undefined) return { id, get: async () => ({ exists: false }) };
            docSeq += 1;
            return { id: `deck-${docSeq}` };
          },
          where: () => ({ get: async () => ({ docs: [] }) }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async () => ({ exists: !!meta, data: () => meta }),
        set: (ref, data) => {
          if (ref && ref._isMeta) state.metaSets.push(data);
          else state.listSets.push({ ref, data });
        },
        update: (_ref, data) => state.metaUpdates.push(data),
      };
      return fn(tx);
    },
  };

  return { db, state };
}

describe("bulkCreateLists atomic import", () => {
  test("splits 250 cards into three decks with sequential names and increments cardCount once", async () => {
    const { db, state } = fakeDb({ tier: "free", cardCount: 0 });

    const result = await bulkCreateLists(db, "user-1", {
      name: "Bulk",
      concept: "term / definition",
      associations: makeAssociations(250),
      settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
    });

    expect(result.ids).toEqual(["deck-1", "deck-2", "deck-3"]);
    expect(state.listSets).toHaveLength(3);
    expect(state.listSets.map((w) => w.data.name)).toEqual(["Bulk", "Bulk-2", "Bulk-3"]);
    expect(state.listSets.map((w) => w.data.associations.length)).toEqual([100, 100, 50]);
    expect(state.listSets.every((w) => w.data.userId === "user-1")).toBe(true);
    expect(state.metaUpdates).toHaveLength(1);
    expect(state.metaUpdates[0].cardCount.operand).toBe(250);
    expect(state.metaSets).toHaveLength(0);
  });

  test("honors cardsPerDeck instead of the default deck size", async () => {
    const { db, state } = fakeDb({ tier: "free", cardCount: 0 });

    const result = await bulkCreateLists(db, "user-1", {
      name: "Wide",
      concept: "term / definition",
      associations: makeAssociations(700),
      cardsPerDeck: 300,
    });

    expect(result.ids).toHaveLength(3);
    expect(state.listSets.map((w) => w.data.associations.length)).toEqual([300, 300, 100]);
    expect(state.listSets.map((w) => w.data.name)).toEqual(["Wide", "Wide-2", "Wide-3"]);
  });

  test("rejects an import that would exceed the free quota without writing anything", async () => {
    const { db, state } = fakeDb({
      tier: "free",
      cardCount: getMaxCards("free") - 50,
    });

    await expect(
      bulkCreateLists(db, "user-1", {
        name: "Over",
        concept: "term / definition",
        associations: makeAssociations(100),
      })
    ).rejects.toBeInstanceOf(QuotaExceededError);

    expect(state.listSets).toHaveLength(0);
    expect(state.metaUpdates).toHaveLength(0);
    expect(state.metaSets).toHaveLength(0);
  });

  test("allows an import that lands exactly on the free quota (inclusive bound)", async () => {
    const { db, state } = fakeDb({
      tier: "free",
      cardCount: getMaxCards("free") - 100,
    });

    const result = await bulkCreateLists(db, "user-1", {
      name: "Exact",
      concept: "term / definition",
      associations: makeAssociations(100),
    });

    expect(result.ids).toHaveLength(1);
    expect(state.listSets).toHaveLength(1);
    expect(state.metaUpdates).toHaveLength(1);
    expect(state.metaUpdates[0].cardCount.operand).toBe(100);
  });

  test("creates the meta document with the exact count when the meta doc does not exist yet", async () => {
    const { db, state } = fakeDb(undefined);

    const result = await bulkCreateLists(db, "user-1", {
      name: "First",
      concept: "term / definition",
      associations: makeAssociations(120),
    });

    expect(result.ids).toHaveLength(2);
    expect(state.listSets).toHaveLength(2);
    expect(state.metaUpdates).toHaveLength(0);
    expect(state.metaSets).toHaveLength(1);
    expect(state.metaSets[0].cardCount).toBe(120);
  });
});
