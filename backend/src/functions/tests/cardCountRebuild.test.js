const { getOrCreateMeta } = require("../src/utils/helpers");

// getOrCreateMeta rebuilds cardCount from the user's decks when the meta doc is
// missing. A deck whose `associations` was corrupted into a map still holds
// cards; counting only arrays drove the rebuilt counter toward 0
// (docs/issues/P1/2026-10-15-cardcount-cero-con-associations-malformado.md).

function fakeDbWithLists(listDocs) {
  const metaRef = {
    get: async () => ({ exists: false }),
    set: async () => undefined,
  };
  return {
    collection: (name) => {
      if (name === "users") {
        return {
          doc: () => ({ collection: () => ({ doc: () => metaRef }) }),
        };
      }
      if (name === "lists") {
        return {
          where: () => ({
            get: async () => ({
              docs: listDocs.map((data) => ({ data: () => data })),
            }),
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
  };
}

describe("getOrCreateMeta cardCount rebuild", () => {
  test("sums array-shaped and map-shaped associations alike", async () => {
    const db = fakeDbWithLists([
      { associations: [{ id: "a" }, { id: "b" }, { id: "c" }] },
      { associations: { "card-1": { hits: 1 }, "card-2": { hits: 2 } } },
      { associations: null },
      {},
    ]);

    const { data } = await getOrCreateMeta(db, "user-1");

    expect(data.cardCount).toBe(5);
    // U-07: listCount rebuilds alongside cardCount so legacy metas can enter
    // the deck-ceiling guard without a backfill migration.
    expect(data.listCount).toBe(4);
  });

  test("stays 0 when the user has no decks", async () => {
    const { data } = await getOrCreateMeta(fakeDbWithLists([]), "user-2");

    expect(data.cardCount).toBe(0);
    expect(data.listCount).toBe(0);
  });
});
