import { describe, it, expect, vi, beforeEach } from 'vitest';

// The backend is CommonJS, so vi.mock cannot intercept its internal require()
// calls: the module is loaded outside Vitest's module graph. This test
// preloads require.cache for firebase-admin, exactly like stripeWebhook.test.ts.
//
// utils/firebase.js is NOT faked, so getDb() and FieldValue resolve through the
// stub below. That is deliberate: the test needs the real code path that reads
// the quota counters, only with a Firestore that behaves like Firestore.

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
  const stub = {
    id: resolved,
    filename: resolved,
    path: BACKEND_ROOT,
    exports,
    loaded: true,
    children: [] as unknown[],
    paths: [] as unknown[],
    require: backendRequire,
  };
  require.cache[resolved] = stub as unknown as NodeModule;
}

type StoredDoc = Record<string, unknown>;

interface Ref {
  path: string;
  read: () => StoredDoc | undefined;
  write: (value: StoredDoc) => void;
}

const FREE_AI_DAILY_LIMIT = 100;
const PREMIUM_AI_DAILY_LIMIT = 1000;
const MONTH = '2026-10';
const TODAY = '2026-10-12';
const NEXT_DAY = '2026-10-13';

const store = new Map<string, StoredDoc>();

function ref(path: string): Ref {
  return {
    path,
    read: () => store.get(path),
    write: (value) => {
      store.set(path, value);
    },
  };
}

function snapshot(path: string) {
  const data = store.get(path);
  return { exists: data !== undefined, data: () => data };
}

// Firestore serialises conflicting transactions. Without this mutex the
// concurrency test below would prove nothing: every reservation would read the
// same starting figure and the fake would happily let them all through.
let lock: Promise<unknown> = Promise.resolve();

// Chained collection()/doc()/collection() has to resolve to the full document
// path, so a doc handle doubles as a collection handle.
function fakeCollection(path: string) {
  return {
    doc: (docId: string) => ({
      ...ref(`${path}/${docId}`),
      collection: (sub: string) => fakeCollection(`${path}/${docId}/${sub}`),
    }),
  };
}

function fakeDb() {
  return {
    runTransaction: <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
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
  };
}

const tx = {
  get: async (r: Ref) => snapshot(r.path),
  set: async (r: Ref, value: StoredDoc, options?: { merge?: boolean }) => {
    const existing = r.read();
    if (options?.merge && existing) {
      Object.assign(existing, value);
      return;
    }
    r.write(value);
  },
};

function preloadFirebase() {
  preloadMock(ADMIN_APP_PATH, { initializeApp: () => undefined });
  preloadMock(ADMIN_FIRESTORE_PATH, {
    getFirestore: () => fakeDb(),
    FieldValue: { serverTimestamp: () => '__SERVER_TS__' },
  });
  preloadMock(ADMIN_AUTH_PATH, { getAuth: () => ({ __auth: true }) });
}

function loadAiDeckQuota() {
  preloadFirebase();
  delete require.cache[require.resolve('../../backend/src/functions/src/services/aiDeckQuota')];
  delete require.cache[require.resolve('../../backend/src/functions/src/utils/meteredQuota')];
  delete require.cache[require.resolve('../../backend/src/functions/src/utils/firebase')];
  return require('../../backend/src/functions/src/services/aiDeckQuota');
}

const META_PATH = 'users/u1/meta/main';
const GLOBAL_PATH = 'usage/global';

function metaRef(): Ref {
  return ref(META_PATH);
}

function seedUser(tier = 'free') {
  store.set(META_PATH, { tier, cardQuota: 1000, ytAiUsedToday: 0, ytAiDateKey: TODAY });
}

describe('AI deck quota (backend)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.clear();
    lock = Promise.resolve();
    seedUser();
  });

  describe('concurrency', () => {
    // This is the defect. With the old read-compare-call-write shape all 20
    // requests read ytAiUsedToday=0, all passed the 100-point check, and all
    // spent 100 points: a realised ceiling of 2000 against a limit of 100.
    it('lets exactly one of 20 simultaneous massive decks through', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();

      const attempts = await Promise.allSettled(
        Array.from({ length: 20 }, () =>
          runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => 'deck')
        )
      );

      const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
      const rejected = attempts.filter((a) => a.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(19);
      expect((rejected[0] as PromiseRejectedResult).reason.code).toBe('AI_QUOTA_EXCEEDED');

      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(100);
      expect(store.get(GLOBAL_PATH)?.aiCalls).toBe(1);
    });

    it('records every increment when many requests fit inside the limit', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();

      const attempts = await Promise.allSettled(
        Array.from({ length: 20 }, () =>
          runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 15, async () => 'deck')
        )
      );

      const fulfilled = attempts.filter((a) => a.status === 'fulfilled').length;

      // 100 points of free allowance at 15 per express deck.
      expect(fulfilled).toBe(6);
      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(90);
      expect(store.get(GLOBAL_PATH)?.aiCalls).toBe(6);
    });

    it('does not lose the global call count when the user points are exhausted', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();
      store.set(GLOBAL_PATH, { dateKey: TODAY, aiCalls: 3 });

      await Promise.allSettled(
        Array.from({ length: 10 }, () =>
          runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => 'deck')
        )
      );

      expect(store.get(GLOBAL_PATH)?.aiCalls).toBe(4);
    });
  });

  describe('limits', () => {
    it('resolves the daily limit from the tier read inside the transaction', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();
      seedUser('premium');

      const outcome = await runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => 'deck');

      expect(outcome.quota.limit).toBe(PREMIUM_AI_DAILY_LIMIT);
      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(100);
    });

    it('rejects the request and writes nothing when the user is over', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();
      store.set(META_PATH, { tier: 'free', ytAiUsedToday: 95, ytAiDateKey: TODAY });

      await expect(
        runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => 'deck')
      ).rejects.toMatchObject({ code: 'AI_QUOTA_EXCEEDED' });

      // Both counters must be untouched: the throw aborts the transaction.
      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(95);
      expect(store.get(GLOBAL_PATH)).toBeUndefined();
    });

    it('reports the free limit to a free user', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();

      const outcome = await runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 30, async () => 'deck');

      expect(outcome.quota.limit).toBe(FREE_AI_DAILY_LIMIT);
      expect(outcome.quota.usedPoints).toBe(30);
      expect(outcome.quota.remainingPoints).toBe(70);
    });
  });

  describe('period reset', () => {
    it('starts from zero when the stored counter belongs to a previous day', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();
      store.set(META_PATH, { tier: 'free', ytAiUsedToday: 100, ytAiDateKey: '2026-10-01' });
      store.set(GLOBAL_PATH, { dateKey: '2026-10-01', aiCalls: 200 });

      const outcome = await runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => 'deck');

      expect(outcome.result).toBe('deck');
      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(100);
      expect(store.get(META_PATH)?.ytAiDateKey).toBe(TODAY);
      expect(store.get(GLOBAL_PATH)?.aiCalls).toBe(1);
    });
  });

  describe('refund', () => {
    it('gives the points back when Gemini fails', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();

      await expect(
        runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => {
          throw new Error('GEMINI down');
        })
      ).rejects.toThrow('GEMINI down');

      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(0);
      expect(store.get(GLOBAL_PATH)?.aiCalls).toBe(0);
    });

    it('gives the points back when Gemini returns no terms', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();

      await expect(
        runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => {
          const empty = new Error('No se pudieron extraer términos del texto.');
          empty.code = 'NO_ITEMS';
          throw empty;
        })
      ).rejects.toMatchObject({ code: 'NO_ITEMS' });

      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(0);
      expect(store.get(GLOBAL_PATH)?.aiCalls).toBe(0);
    });

    it('lets the next request through after a refund', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();

      await expect(
        runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');

      const outcome = await runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 100, async () => 'deck');
      expect(outcome.result).toBe('deck');
      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(100);
    });

    it('does not touch the new day when the day rolled over mid-flight', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();
      store.set(META_PATH, { tier: 'free', ytAiUsedToday: 30, ytAiDateKey: NEXT_DAY });
      store.set(GLOBAL_PATH, { dateKey: NEXT_DAY, aiCalls: 2 });

      // The reservation belongs to TODAY. By the time it is refunded, the
      // counters already hold NEXT_DAY values, which the user never spent.
      const { refundQuota } = require('../../backend/src/functions/src/utils/meteredQuota');
      const { buildAiDeckQuotaSpec } = loadAiDeckQuota();

      await refundQuota(fakeDb(), buildAiDeckQuotaSpec(fakeDb(), metaRef(), TODAY, 100));

      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(30);
      expect(store.get(GLOBAL_PATH)?.aiCalls).toBe(2);
    });
  });

  describe('meta document', () => {
    it('writes a meta doc for a user who has none yet', async () => {
      const { runAiDeckWithQuota } = loadAiDeckQuota();
      store.set(META_PATH, { tier: 'free' });

      await runAiDeckWithQuota(fakeDb(), metaRef(), TODAY, 30, async () => 'deck');

      expect(store.get(META_PATH)?.ytAiDateKey).toBe(TODAY);
      expect(store.get(META_PATH)?.ytAiUsedToday).toBe(30);
    });
  });
});

describe('translation quota (backend)', () => {
  const USER_PATH = 'users/u1/usage/translation_2026-10';
  const GLOBAL_PATH = 'usage_stats/translation_global_2026-10';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.clear();
    lock = Promise.resolve();
    store.set('users/u1/meta/main', { tier: 'free' });
  });

  function loadTranslationQuota() {
    preloadFirebase();
    delete require.cache[require.resolve('../../backend/src/functions/src/services/translationQuota')];
    delete require.cache[require.resolve('../../backend/src/functions/src/utils/meteredQuota')];
    delete require.cache[require.resolve('../../backend/src/functions/src/utils/firebase')];
    return require('../../backend/src/functions/src/services/translationQuota');
  }

  it('lets exactly the allowance through under concurrency', async () => {
    const { buildTranslationQuotaSpec } = loadTranslationQuota();
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');

    const db = fakeDb();
    // 20 000 free chars, 5 000 per request: four must fit.
    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        runMeteredCall(
          db,
          buildTranslationQuotaSpec(db, 'u1', MONTH, 5000),
          async () => 'ok'
        )
      )
    );

    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(4);
    expect(attempts.filter((a) => a.status === 'rejected')).toHaveLength(16);
    expect(store.get(USER_PATH)?.charactersTranslated).toBe(20000);
    expect(store.get(GLOBAL_PATH)?.totalCharactersTranslated).toBe(20000);
  });

  it('refunds the characters when the translation call fails', async () => {
    const { buildTranslationQuotaSpec } = loadTranslationQuota();
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');

    const db = fakeDb();
    await expect(
      runMeteredCall(db, buildTranslationQuotaSpec(db, 'u1', MONTH, 1200), async () => {
        throw new Error('Google Translate 500');
      })
    ).rejects.toThrow('Google Translate 500');

    expect(store.get(USER_PATH)?.charactersTranslated).toBe(0);
    expect(store.get(GLOBAL_PATH)?.totalCharactersTranslated).toBe(0);
  });

  it('counts calls separately from characters', async () => {
    const { buildTranslationQuotaSpec } = loadTranslationQuota();
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');

    const db = fakeDb();
    for (let i = 0; i < 3; i++) {
      await runMeteredCall(db, buildTranslationQuotaSpec(db, 'u1', MONTH, 100), async () => 'ok');
    }

    expect(store.get(USER_PATH)?.charactersTranslated).toBe(300);
    expect(store.get(USER_PATH)?.callCount).toBe(3);
    expect(store.get(USER_PATH)?.currentMonth).toBe(MONTH);
    expect(store.get(USER_PATH)?.userId).toBe('u1');
  });
});

describe('TTS quota (backend)', () => {
  const USER_PATH = 'usage/chirpTts/users/u1/months/2026-10';
  const GLOBAL_PATH = 'usage/chirpTts/global/2026-10';

  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
    lock = Promise.resolve();
    store.set('users/u1/meta/main', { tier: 'free' });
  });

  function loadTtsQuota() {
    preloadFirebase();
    delete require.cache[require.resolve('../../backend/src/functions/src/services/chirpTtsService/quota')];
    delete require.cache[require.resolve('../../backend/src/functions/src/utils/meteredQuota')];
    delete require.cache[require.resolve('../../backend/src/functions/src/utils/firebase')];
    return require('../../backend/src/functions/src/services/chirpTtsService/quota');
  }

  function ttsSpec(db: unknown, charCount: number) {
    const { buildTtsQuotaSpec } = loadTtsQuota();
    return buildTtsQuotaSpec(db, 'u1', MONTH, charCount);
  }

  it('stops at 5 000 free characters no matter how many requests race', async () => {
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');
    const db = fakeDb();

    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () => runMeteredCall(db, ttsSpec(db, 1000), async () => 'audio'))
    );

    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(5);
    expect(store.get(USER_PATH)?.charsUsed).toBe(5000);
    expect(store.get(GLOBAL_PATH)?.charsUsed).toBe(5000);
    expect(store.get(USER_PATH)?.callCount).toBe(5);
    expect(store.get(GLOBAL_PATH)?.totalCalls).toBe(5);
  });

  it('refunds the characters when synthesis fails', async () => {
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');
    const db = fakeDb();

    await expect(
      runMeteredCall(db, ttsSpec(db, 800), async () => {
        const failure = new Error('synth failed');
        failure.code = 'TTS_ERROR';
        throw failure;
      })
    ).rejects.toMatchObject({ code: 'TTS_ERROR' });

    expect(store.get(USER_PATH)?.charsUsed).toBe(0);
    expect(store.get(GLOBAL_PATH)?.charsUsed).toBe(0);
  });

  it('keeps the USER_QUOTA_EXCEEDED code the route maps to 429', async () => {
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');
    const db = fakeDb();
    store.set(USER_PATH, { monthKey: MONTH, charsUsed: 4500, callCount: 4 });

    await expect(runMeteredCall(db, ttsSpec(db, 1000), async () => 'audio')).rejects.toMatchObject({
      code: 'USER_QUOTA_EXCEEDED',
      used: 4500,
      limit: 5000,
    });

    expect(store.get(USER_PATH)?.charsUsed).toBe(4500);
  });
});

describe('STT quota (backend)', () => {
  const USER_PATH = 'usage/chipttStt/users/u1/months/2026-10';
  const GLOBAL_PATH = 'usage/chipttStt/global/2026-10';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.clear();
    lock = Promise.resolve();
    store.set('users/u1/meta/main', { tier: 'free' });
  });

  function sttSpec(db: unknown, audioSeconds: number) {
    preloadFirebase();
    delete require.cache[require.resolve('../../backend/src/functions/src/services/sttService/quota')];
    delete require.cache[require.resolve('../../backend/src/functions/src/utils/meteredQuota')];
    delete require.cache[require.resolve('../../backend/src/functions/src/utils/firebase')];
    const { buildSttQuotaSpec } = require('../../backend/src/functions/src/services/sttService/quota');
    return buildSttQuotaSpec(db, 'u1', MONTH, audioSeconds);
  }

  it('stops at 3 000 free seconds under concurrency', async () => {
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');
    const db = fakeDb();

    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () => runMeteredCall(db, sttSpec(db, 600), async () => 'text'))
    );

    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(5);
    expect(store.get(USER_PATH)?.audioSecondsUsed).toBe(3000);
    expect(store.get(GLOBAL_PATH)?.audioSecondsUsed).toBe(3000);
  });

  it('refunds the seconds when the recogniser fails', async () => {
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');
    const db = fakeDb();

    await expect(
      runMeteredCall(db, sttSpec(db, 60), async () => {
        throw new Error('speech 503');
      })
    ).rejects.toThrow('speech 503');

    expect(store.get(USER_PATH)?.audioSecondsUsed).toBe(0);
  });

  it('refunds the seconds on NO_SPEECH, which the product does not charge for', async () => {
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');
    const db = fakeDb();

    await expect(
      runMeteredCall(db, sttSpec(db, 60), async () => {
        const silence = new Error('No speech detected');
        silence.code = 'NO_SPEECH';
        throw silence;
      })
    ).rejects.toMatchObject({ code: 'NO_SPEECH' });

    expect(store.get(USER_PATH)?.audioSecondsUsed).toBe(0);
    expect(store.get(GLOBAL_PATH)?.audioSecondsUsed).toBe(0);
  });

  it('reserves before the recogniser runs, so an over-quota user is never billed', async () => {
    const { runMeteredCall } = require('../../backend/src/functions/src/utils/meteredQuota');
    const db = fakeDb();
    store.set(USER_PATH, { monthKey: MONTH, audioSecondsUsed: 3000, callCount: 50 });

    const spend = vi.fn(async () => 'text');

    await expect(runMeteredCall(db, sttSpec(db, 60), spend)).rejects.toMatchObject({
      code: 'USER_QUOTA_EXCEEDED',
    });

    expect(spend).not.toHaveBeenCalled();
  });
});