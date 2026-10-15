// P0 reproduction: updateListFields corrupts `associations` from array to map.
//
// Run with the emulators up:  npm run emulators
//
// The script seeds a 3-card deck through the real Cloud Function, then sends
// the same delta payload the client sends from gameStore.flushSync. Before the
// fix, Firestore stores the partial update `associations.<uuid>.<field>` and
// the whole array is replaced by a map keyed by association id (this is the
// exact shape found in production on 2026-09-25). After the fix, the array
// must survive and the delta must be applied in place.
//
// Exit code 1 means the bug is present; 0 means the array survived.

const PROJECT = 'fladycard-22a3e';
const AUTH = 'http://localhost:9099';
const FS = 'http://localhost:9080';
const FN = `http://localhost:9001/${PROJECT}/us-central1`;

const firestoreHeaders = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

const docPath = (p) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`;

function decodeValue(v) {
  if (!v) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(decodeValue);
  if (v.mapValue) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = decodeValue(val);
    return out;
  }
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  return v;
}

async function readDoc(path) {
  const res = await fetch(docPath(path), { headers: firestoreHeaders });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`read ${path} failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const out = {};
  for (const [k, v] of Object.entries(json.fields || {})) out[k] = decodeValue(v);
  return out;
}

async function waitFor(url, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function createUser() {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `repro-${Date.now()}@test.local`,
      password: 'test1234',
      returnSecureToken: true,
    }),
  });
  const json = await res.json();
  if (!json.idToken) throw new Error(`could not create user: ${JSON.stringify(json)}`);
  return { uid: json.localId, idToken: json.idToken };
}

async function call(fn, token, body) {
  const res = await fetch(`${FN}/${fn}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

const CARDS = [
  { id: 'aaaaaaaa-1111-4aaa-8bbb-000000000001', term: 'alpha', definition: 'alfa' },
  { id: 'aaaaaaaa-2222-4aaa-8bbb-000000000002', term: 'beta', definition: 'beta' },
  { id: 'aaaaaaaa-3333-4aaa-8bbb-000000000003', term: 'gamma', definition: 'gamma' },
];

async function main() {
  console.log('0. Emulators reachable');
  if (!(await waitFor(`${FS}/`))) throw new Error('Firestore emulator (:9080) is not up — run `npm run emulators`');
  if (!(await waitFor(`${FN}/`))) throw new Error('Functions emulator (:9001) is not up — run `npm run emulators`');

  console.log('1. Create user + 3-card deck');
  const { uid, idToken } = await createUser();
  const created = await call('createList', idToken, {
    userId: uid,
    name: 'P0 repro deck',
    concept: 'repro',
    associations: CARDS,
    settings: { mode: 'normal', flipOrder: 'normal', threshold: 0.8 },
  });
  if (created.status !== 200 || !created.json) {
    throw new Error(`createList failed: ${created.status} ${JSON.stringify(created.json)}`);
  }
  const listId = created.json.id;
  if (!listId) throw new Error(`createList returned no id: ${JSON.stringify(created.json)}`);
  console.log(`   listId=${listId}`);

  const before = await readDoc(`lists/${listId}`);
  const beforeUpdatedAt = Date.parse(before.updatedAt);
  console.log(`   associations before: Array=${Array.isArray(before.associations)} length=${before.associations.length}`);

  console.log('2. Send updateListFields with UUID-keyed deltas (same payload as flushSync)');
  const flushed = await call('updateListFields', idToken, {
    listId,
    baseUpdatedAt: beforeUpdatedAt,
    deltas: [
      {
        id: CARDS[0].id,
        fields: { hits: 1, misses: 0, status: 'correct', isLearned: false, currentCycle: 2, timesPlayed: 1 },
        updatedAt: Date.now(),
      },
    ],
  });
  if (flushed.status !== 200) {
    throw new Error(`updateListFields failed: ${flushed.status} ${JSON.stringify(flushed.json)}`);
  }

  console.log('3. Inspect the stored document');
  const after = await readDoc(`lists/${listId}`);
  const stored = after.associations;
  const isMap = stored !== null && typeof stored === 'object' && !Array.isArray(stored);

  if (isMap) {
    const first = stored[CARDS[0].id];
    console.log('\nRESULT: BUG');
    console.log(`  associations is now a MAP with ${Object.keys(stored).length} keys`);
    console.log(`  first entry (${CARDS[0].id}): ${JSON.stringify(first)}`);
    console.log('  term/definition are gone from the document (only the delta fields remain).');
    console.log('  This is the exact production shape found on 2026-09-25.');
    process.exit(1);
  }

  const firstCard = (stored || []).find((c) => c.id === CARDS[0].id);
  const deltaApplied = firstCard && firstCard.hits === 1 && firstCard.status === 'correct';
  console.log('\nRESULT: OK');
  console.log(`  associations is still an Array of ${stored.length}`);
  console.log(`  first card after delta: ${JSON.stringify(firstCard)}`);
  if (!deltaApplied) {
    console.log('  WARNING: array survived but the delta was not applied.');
    process.exit(1);
  }
  console.log('  Delta applied in place; term/definition preserved.');
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(2);
});
