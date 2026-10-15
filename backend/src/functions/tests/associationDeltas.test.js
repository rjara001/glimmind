const { applyDeltasToList, normalizeAssociationsToList } = require("../src/utils/associationDeltas");

const CARD_A = {
  id: "aaaaaaaa-1111-4aaa-8bbb-000000000001",
  term: "alpha",
  definition: ["alfa"],
  hits: 0,
  misses: 0,
  isLearned: false,
  currentCycle: 1,
  status: "pending",
  timesPlayed: 0,
};
const CARD_B = {
  id: "aaaaaaaa-2222-4aaa-8bbb-000000000002",
  term: "beta",
  definition: ["beta"],
  hits: 0,
  misses: 0,
  isLearned: false,
  currentCycle: 1,
  status: "pending",
  timesPlayed: 0,
};

describe("applyDeltasToList", () => {
  test("applies a delta to the matching card and keeps term/definition", () => {
    const result = applyDeltasToList([CARD_A, CARD_B], [
      { id: CARD_A.id, fields: { hits: 3, status: "correct" } },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: CARD_A.id,
      term: "alpha",
      definition: ["alfa"],
      hits: 3,
      status: "correct",
    });
    expect(result[1]).toEqual(CARD_B);
  });

  test("keeps the result an Array (never a map)", () => {
    const result = applyDeltasToList([CARD_A, CARD_B], [
      { id: CARD_A.id, fields: { hits: 1 } },
    ]);

    expect(Array.isArray(result)).toBe(true);
  });

  test("merges several deltas for the same card", () => {
    const result = applyDeltasToList([CARD_A], [
      { id: CARD_A.id, fields: { hits: 1 } },
      { id: CARD_A.id, fields: { misses: 2, isLearned: true } },
    ]);

    expect(result[0]).toMatchObject({ hits: 1, misses: 2, isLearned: true });
  });

  test("drops deltas for unknown ids instead of resurrecting deleted cards", () => {
    const result = applyDeltasToList([CARD_A], [
      { id: "deleted-card-id", fields: { hits: 1 } },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(CARD_A.id);
  });

  test("rebuilds a legacy corrupted map into an array keyed by association id", () => {
    const corrupted = {
      [CARD_A.id]: { hits: 2, isLearned: true, currentCycle: 3, status: "correct", misses: 1, timesPlayed: 4 },
    };

    const result = applyDeltasToList(corrupted, [
      { id: CARD_A.id, fields: { hits: 5 } },
    ]);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: CARD_A.id, hits: 5, isLearned: true });
  });

  test("returns an empty array for null/undefined associations", () => {
    expect(applyDeltasToList(null, [{ id: CARD_A.id, fields: { hits: 1 } }])).toEqual([]);
    expect(applyDeltasToList(undefined, [{ id: CARD_A.id, fields: { hits: 1 } }])).toEqual([]);
  });

  test("does not mutate the input array", () => {
    const input = [{ ...CARD_A }];
    const result = applyDeltasToList(input, [{ id: CARD_A.id, fields: { hits: 7 } }]);

    expect(input[0].hits).toBe(0);
    expect(result[0].hits).toBe(7);
  });
});

describe("normalizeAssociationsToList", () => {
  test("returns arrays untouched", () => {
    expect(normalizeAssociationsToList([CARD_A])).toEqual([CARD_A]);
  });

  test("turns a map into an array using the key as id", () => {
    const result = normalizeAssociationsToList({
      [CARD_B.id]: { term: "beta", hits: 1 },
    });

    expect(result).toEqual([{ id: CARD_B.id, term: "beta", hits: 1 }]);
  });

  test("keeps an explicit id over the map key", () => {
    const result = normalizeAssociationsToList({
      "some-key": { id: CARD_A.id, term: "alpha" },
    });

    expect(result).toEqual([{ id: CARD_A.id, term: "alpha" }]);
  });

  test("returns [] for non-object values", () => {
    expect(normalizeAssociationsToList("bogus")).toEqual([]);
    expect(normalizeAssociationsToList(42)).toEqual([]);
    expect(normalizeAssociationsToList(null)).toEqual([]);
  });
});
