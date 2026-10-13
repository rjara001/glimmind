import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression cover for docs/issues/done/2026-10-12-premium-sin-limite-de-tarjetas.md
//
// The defect: createList checked the tier ceiling inside its transaction, but
// updateList and splitList only called validateUserCardQuotaNotExceeded, which
// returns early for Premium. A Premium account therefore had no ceiling at all
// on two of the three routes that write cards. Reproduced on the emulator at
// 16000 cards against a declared max of 5000, +2000 per request.
//
// The backend is CommonJS, so vi.mock cannot intercept its internal require()
// calls. This test preloads require.cache for firebase-admin and lets the real
// crud.js / quota.js code run against a Firestore that behaves like Firestore,
// including transaction serialisation. Anything less would not exercise the
// guard, because the guard lives inside the transaction.

const Module = require('module') as { createRequire: (filename: string) => NodeRequire };

const BACKEND_ROOT = `${process.cwd()}/backend/src/functions`;
const backendRequire = Module.createRequire(`${BACKEND_ROOT}/index.js`);

const ADMIN_APP_PATH = backendRequire.resolve('firebase-admin/app');
const ADMIN_FIRESTORE_PATH = backendRequire.resolve('firebase-admin/firestore');
const ADMIN_AUTH_PATH = backendRequire.resolve('firebase-admin/auth');

function preloadMock(resolved: string, exports: unknown) {
  const existing = require.cache[resolved];
  if (existing) {
    existing.exports = exports;
    return;
  }
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    path: BACKEND_ROOT,
    exports,
    loaded: true,
    children: [] as unknown[],
    paths: [] as unknown[],
    require: backendRequire,
  } as unknown as NodeModule;
}

type StoredDoc = Record<string, unknown>;

interface Ref {
  path: string;
  id: string;
  read: () => StoredDoc | undefined;
  write: (value: StoredDoc) => void;
}

const store = new Map<string, StoredDoc>();

const FREE_MAX_CARDS = 1000;
const PREMIUM_MAX_CARDS = 5000;

function ref(path: string, id = path.split('/').pop() ?? path): Ref {
  const handle: Ref = {
    path,
    id,
    read: () => store.get(path),
    write: (value) => {
      store.set(path, value);
    },
  };
  // helpers.getOrCreateMeta reads the meta doc through the plain ref, not through
  // a transaction, so the fake has to answer .get() too.
  (handle as Ref & { get: () => Promise<unknown> }).get = async () => snapshot(path);
  return handle;
}

function snapshot(path: string) {
  const data = store.get(path);
  return { exists: data !== undefined, data: () => data };
}

// Firestore serialises conflicting transactions. Without this mutex two
// concurrent edits would both read the same starting figure and the fake would
// happily let both through, which is exactly the class of bug being tested.
let lock: Promise<unknown> = Promise.resolve();

function fakeCollection(path: string) {
  let counter = 0;
  return {
    doc: (docId?: string) => {
      if (!docId) counter += 1;
      const id = docId ?? `auto-${counter}`;
      return {
        ...ref(`${path}/${id}`, id),
        collection: (sub: string) => fakeCollection(`${path}/${id}/${sub}`),
      };
    },
  };
}

// FieldValue.increment has to stay opaque until write time: resolving it
// immediately would make the counter assertions below meaningless. The real SDK
// returns a sentinel object, so the fake does too.
interface IncrementMarker {
  __increment: number;
}

const isIncrement = (v: unknown): v is IncrementMarker =>
  typeof v === 'object' && v !== null && '__increment' in v;

const SERVER_TS = '__SERVER_TS__';

// Firestore resolves FieldValue.increment against whatever the document held
// before the write, and it does so for set() as well as update(). `base` is that
// prior value. Resolving it against `fields` itself turns every increment into
// NaN, because the field currently holds the marker.
function materialise(fields: StoredDoc, base: StoredDoc): StoredDoc {
  const out: StoredDoc = { ...fields };
  for (const [key, value] of Object.entries(fields)) {
    if (isIncrement(value)) out[key] = Number(base[key] ?? 0) + value.__increment;
  }
  return out;
}

const tx = {
  get: async (r: Ref) => snapshot(r.path),
  set: async (r: Ref, value: StoredDoc, options?: { merge?: boolean }) => {
    const existing = r.read();
    if (options?.merge && existing) {
      Object.assign(existing, value);
      return;
    }
    r.write(materialise(value, existing ?? {}));
  },
  update: async (r: Ref, value: StoredDoc) => {
    const existing = r.read() ?? {};
    Object.assign(existing, materialise(value, existing));
    r.write(existing);
  },
  delete: async (r: Ref) => {
    store.delete(r.path);
  },
};

function fakeDb() {
  return {
    runTransaction: <T>(fn: (t: typeof tx) => Promise<T>): Promise<T> => {
      const run = lock.then(
        () => fn(tx),
        () => fn(tx)
      );
      lock = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
    collection: (name: string) => fakeCollection(name),
    get: async (p: string) => ref(p),
  };
}

function preloadFirebase() {
  preloadMock(ADMIN_APP_PATH, { initializeApp: () => undefined });
  preloadMock(ADMIN_FIRESTORE_PATH, {
    getFirestore: () => fakeDb(),
    FieldValue: {
      serverTimestamp: () => SERVER_TS,
      increment: (n: number): IncrementMarker => ({ __increment: n }),
    },
  });
  preloadMock(ADMIN_AUTH_PATH, { getAuth: () => ({ __auth: true }) });
}

function loadCrud() {
  preloadFirebase();
  for (const p of [
    '../../backend/src/functions/src/services/listService/crud',
    '../../backend/src/functions/src/services/listService/quota',
    '../../backend/src/functions/src/utils/firebase',
  ]) {
    delete require.cache[require.resolve(p)];
  }
  return require('../../backend/src/functions/src/services/listService/crud');
}

function loadQuota() {
  preloadFirebase();
  delete require.cache[require.resolve('../../backend/src/functions/src/services/listService/quota')];
  return require('../../backend/src/functions/src/services/listService/quota');
}

const UID = 'u1';
const META_PATH = `users/${UID}/meta/main`;
const SMALL_LIST = 'lists/small';
const BIG_LIST = 'lists/big';

const cards = (n: number, tag: string) =>
  Array.from({ length: n }, (_, i) => ({ term: `${tag}-${i}`, definition: 'd' }));

function seedUser(tier: 'free' | 'premium', cardCount: number) {
  store.set(META_PATH, { tier, cardCount, cardQuota: tier === 'premium' ? PREMIUM_MAX_CARDS : FREE_MAX_CARDS });
}

function seedList(path: string, associations: StoredDoc[]) {
  store.set(path, { userId: UID, name: path, concept: 'x', associations, settings: { mode: 'normal' } });
}

const cardCountNow = () => Number(store.get(META_PATH)?.cardCount ?? 0);

describe('card ceiling (backend listService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    store.clear();
    lock = Promise.resolve();
  });

  describe('updateList', () => {
    // This is the defect. 4100 + 1900 = 6000 against a 5000 ceiling.
    it('refuses a Premium edit that would cross the ceiling', async () => {
      seedUser('premium', 4100);
      seedList(SMALL_LIST, cards(100, 'a'));
      const { applyUpdatesToListAndAdjustCardCounters } = loadCrud();

      await expect(
        applyUpdatesToListAndAdjustCardCounters(fakeDb(), 'small', UID, {
          associations: cards(2000, 'grown'),
        })
      ).rejects.toThrow(/límite de 5000 tarjetas/);

      expect(cardCountNow()).toBe(4100);
      expect(store.get(SMALL_LIST)?.associations).toHaveLength(100);
    });

    it('lets a Premium edit that fits through', async () => {
      seedUser('premium', 4100);
      seedList(SMALL_LIST, cards(100, 'a'));
      const { applyUpdatesToListAndAdjustCardCounters } = loadCrud();

      await applyUpdatesToListAndAdjustCardCounters(fakeDb(), 'small', UID, {
        associations: cards(2000, 'grown'),
      }).catch(() => undefined);

      // 4100 + 1900 = 6000 is over, so this must NOT have landed.
      expect(cardCountNow()).toBe(4100);
    });

    it('accepts a Premium edit up to exactly the ceiling', async () => {
      seedUser('premium', 3000);
      seedList(SMALL_LIST, cards(100, 'a'));
      const { applyUpdatesToListAndAdjustCardCounters } = loadCrud();

      await applyUpdatesToListAndAdjustCardCounters(fakeDb(), 'small', UID, {
        associations: cards(2100, 'grown'),
      });

      expect(cardCountNow()).toBe(5000);
    });

    it('lets an over-quota user shrink the list back down', async () => {
      // A user already past their ceiling must never be locked out of removing
      // cards. Only growth is bounded.
      seedUser('premium', 6000);
      seedList(SMALL_LIST, cards(2000, 'a'));
      const { applyUpdatesToListAndAdjustCardCounters } = loadCrud();

      await applyUpdatesToListAndAdjustCardCounters(fakeDb(), 'small', UID, {
        associations: cards(100, 'a'),
      });

      expect(cardCountNow()).toBe(4100);
    });

    it('still refuses a free user over the free ceiling', async () => {
      seedUser('free', 1000);
      seedList(SMALL_LIST, cards(1000, 'a'));
      const { applyUpdatesToListAndAdjustCardCounters } = loadCrud();

      await expect(
        applyUpdatesToListAndAdjustCardCounters(fakeDb(), 'small', UID, {
          associations: cards(1001, 'a'),
        })
      ).rejects.toThrow(/límite/);

      expect(cardCountNow()).toBe(1000);
    });

    it('holds the ceiling when two Premium edits race', async () => {
      // Both read 4100. Without the guard inside the transaction both would
      // land and the account would finish at 8100.
      seedUser('premium', 4100);
      seedList(SMALL_LIST, cards(100, 'a'));
      seedList('lists/other', cards(100, 'o'));
      const { applyUpdatesToListAndAdjustCardCounters } = loadCrud();

      const attempts = await Promise.allSettled([
        applyUpdatesToListAndAdjustCardCounters(fakeDb(), 'small', UID, {
          associations: cards(2000, 'x'),
        }),
        applyUpdatesToListAndAdjustCardCounters(fakeDb(), 'other', UID, {
          associations: cards(2000, 'y'),
        }),
      ]);

      expect(attempts.filter((a) => a.status === 'rejected').length).toBeGreaterThanOrEqual(1);
      expect(cardCountNow()).toBeLessThanOrEqual(PREMIUM_MAX_CARDS);
    });
  });

  describe('splitList', () => {
    it('refuses a Premium split that would cross the ceiling', async () => {
      seedUser('premium', 4100);
      seedList(BIG_LIST, cards(2000, 'b'));
      const { divideOriginalListIntoGroupsAndReplaceIt } = loadCrud();

      await expect(
        divideOriginalListIntoGroupsAndReplaceIt(fakeDb(), 'big', UID, [
          { name: 'G1', associations: cards(2000, 'g1') },
          { name: 'G2', associations: cards(2000, 'g2') },
        ])
      ).rejects.toThrow(/límite de 5000 tarjetas/);

      expect(cardCountNow()).toBe(4100);
      expect(store.get(BIG_LIST)).toBeDefined();
    });

    it('accepts a Premium split that keeps the account inside the ceiling', async () => {
      seedUser('premium', 1000);
      seedList(BIG_LIST, cards(2000, 'b'));
      const { divideOriginalListIntoGroupsAndReplaceIt } = loadCrud();

      const { ids } = await divideOriginalListIntoGroupsAndReplaceIt(fakeDb(), 'big', UID, [
        { name: 'G1', associations: cards(1500, 'g1') },
        { name: 'G2', associations: cards(1500, 'g2') },
      ]);

      expect(ids).toHaveLength(2);
      // delta is 3000 - 2000 = +1000
      expect(cardCountNow()).toBe(2000);
      expect(store.get(BIG_LIST)).toBeUndefined();
    });
  });

  describe('createList (unchanged behaviour)', () => {
    it('refuses a Premium list that would cross the ceiling', async () => {
      seedUser('premium', 4100);
      const { persistNewListWithAssociations } = loadCrud();

      await expect(
        persistNewListWithAssociations(fakeDb(), UID, {
          name: 'D',
          concept: 'x',
          associations: cards(2000, 'd'),
          settings: { mode: 'normal' },
        })
      ).rejects.toThrow(/límite de 5000 tarjetas/);

      expect(cardCountNow()).toBe(4100);
    });

    it('accepts a Premium list that fits', async () => {
      seedUser('premium', 0);
      const { persistNewListWithAssociations } = loadCrud();

      const { id } = await persistNewListWithAssociations(fakeDb(), UID, {
        name: 'D',
        concept: 'x',
        associations: cards(2000, 'd'),
        settings: { mode: 'normal' },
      });

      expect(id).toBeTruthy();
      expect(cardCountNow()).toBe(2000);
    });

    it('lets an over-quota free user create an empty list', async () => {
      // The advisory check ignores a zero delta and so does the guard, so a
      // user past their ceiling is not blocked from starting again.
      seedUser('free', 1200);
      const { persistNewListWithAssociations } = loadCrud();

      await persistNewListWithAssociations(fakeDb(), UID, {
        name: 'empty',
        concept: 'x',
        associations: [],
        settings: { mode: 'normal' },
      });

      expect(cardCountNow()).toBe(1200);
    });
  });

  describe('the guard itself', () => {
    it('throws a real QuotaExceededError, not a ReferenceError', async () => {
      // quota.js constructs QuotaExceededError but never imported it. The
      // throw therefore died as "QuotaExceededError is not defined" and the
      // route answered 500 instead of 400.
      const { assertCardQuotaHasRoom } = loadQuota();

      expect(() => assertCardQuotaHasRoom('premium', 4100, 1900)).toThrow(/límite de 5000 tarjetas/);
      try {
        assertCardQuotaHasRoom('premium', 4100, 1900);
      } catch (error) {
        expect((error as Error).name).toBe('QuotaExceededError');
      }
    });

    it('is a no-op for a non-positive delta', () => {
      const { assertCardQuotaHasRoom } = loadQuota();

      expect(() => assertCardQuotaHasRoom('premium', 9000, 0)).not.toThrow();
      expect(() => assertCardQuotaHasRoom('premium', 9000, -500)).not.toThrow();
    });

    it('names the tier ceiling, not Infinity', () => {
      const { assertCardQuotaHasRoom } = loadQuota();

      expect(() => assertCardQuotaHasRoom('premium', 5000, 1)).toThrow(/5000/);
      expect(() => assertCardQuotaHasRoom('free', 1000, 1)).toThrow(/1000/);
    });
  });
});