// Reproduces docs/issues/P0/2026-10-12-premium-sin-limite-de-tarjetas.md
//
//   Terminal 1:  npm run emulators
//   Terminal 2:  node scripts/verify-p0-premium-cards.mjs
//
// Every check drives the real HTTP routes against the real emulator. Nothing
// leaves the machine: no Gemini call, no Google call, no paid API. The script
// creates one throwaway user and deletes it on the way out.
//
// What "PASS" means here is NOT "the request was rejected". It means the
// declared ceiling held: after the call, users/<uid>/meta/main.cardCount must
// still be at or under plans.json premium.maxCards (5000). That is the only
// assertion that survives a 400, a 429 and a 500 alike, so a route cannot pass
// by accident because its error handler blew up first.
//
// As of 2026-10-12: createList PASSES, updateList FAILS, splitList FAILS.

const PROJECT = 'fladycard-22a3e';
const AUTH = 'http://localhost:9099';
const FS = 'http://localhost:9080';
const FN = `http://localhost:9001/${PROJECT}/us-central1`;

const PREMIUM_MAX_CARDS = 5000; // plans.json -> tiers.premium.maxCards
const RATE_LIMIT_NOTE = 'a 429 means you ran this twice inside a minute, not a quota failure';

const doc = (p) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`;
const headers = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `\n          -> ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}\n${'-'.repeat(title.length)}`);
}

const int = (n) => ({ integerValue: String(n) });
const str = (s) => ({ stringValue: s });

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
      email: `p0premium-${Date.now()}@test.local`,
      password: 'test1234',
      returnSecureToken: true,
    }),
  });
  const json = await res.json();
  if (!json.idToken) throw new Error(`could not create user: ${JSON.stringify(json)}`);
  return { uid: json.localId, idToken: json.idToken, email: json.email };
}

async function seed(path, fields) {
  const res = await fetch(doc(path), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`seed ${path} failed: ${res.status} ${await res.text()}`);
}

async function read(path) {
  const res = await fetch(doc(path), { headers });
  if (res.status === 404) return null;
  const json = await res.json();
  const out = {};
  for (const [k, v] of Object.entries(json.fields || {})) {
    out[k] = v.integerValue ?? v.stringValue ?? v.timestampValue ?? v.doubleValue;
  }
  return out;
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

const cardCount = async (uid) => Number((await read(`users/${uid}/meta/main`))?.cardCount ?? 0);

// buildListDocumentData writes `concept` and `settings` unconditionally, so an
// omitted value reaches Firestore as undefined and the write throws 500 before
// any quota logic runs. See docs/issues/P2/2026-10-12-create-list-campos-opcionales.md
const deckFields = { concept: 'repro', settings: { mode: 'normal' } };

const cards = (n, tag) =>
  Array.from({ length: n }, (_, i) => ({
    term: `${tag}-${i}`,
    definition: 'd',
    isArchived: false,
    currentCycle: 0,
  }));

async function cleanup(uid, idToken, email, listIds) {
  for (const id of listIds) {
    await fetch(doc(`lists/${id}`), { method: 'DELETE', headers }).catch(() => {});
  }
  await fetch(doc(`users/${uid}/meta/main`), { method: 'DELETE', headers }).catch(() => {});
  await fetch(doc(`users/${uid}`), { method: 'DELETE', headers }).catch(() => {});
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:delete?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, email, localId: uid }),
  }).catch(() => null);
  console.log(`  cleaned up ${listIds.length} lists, the meta doc and the auth user (auth delete HTTP ${res?.status ?? 'n/a'})`);
}

async function main() {
  console.log('P0 reproduction: Premium card ceiling');
  console.log('declared ceiling: plans.json tiers.premium.maxCards =', PREMIUM_MAX_CARDS);

  section('0. Emulators reachable');
  const up = await waitFor(`${FS}/`);
  check('Firestore emulator on :9080', up);
  check('Auth emulator on :9099', await waitFor(`${AUTH}/`));
  if (!up) {
    console.log('\n  Start them first:  npm run emulators');
    process.exit(1);
  }

  const { uid, idToken, email } = await createUser();
  console.log(`  throwaway user: ${uid}  (${email})`);
  await seed(`users/${uid}/meta/main`, {
    tier: str('premium'),
    cardQuota: int(PREMIUM_MAX_CARDS),
    cardCount: int(0),
  });
  check('seeded a Premium user', (await read(`users/${uid}/meta/main`))?.tier === 'premium');

  section('1. Build a Premium account up to 4100 cards');
  // Three lists. 4100 leaves 900 of headroom, which is what route 2 and route 3
  // are each about to blow through.
  let r = await call('createList', idToken, {
    name: 'A-100',
    userId: uid,
    associations: cards(100, 'a'),
    ...deckFields,
  });
  const listA = r.json?.id;
  check('createList 100 cards accepted', r.status === 200, `HTTP ${r.status} ${JSON.stringify(r.json)}`);

  r = await call('createList', idToken, {
    name: 'B-2000',
    userId: uid,
    associations: cards(2000, 'b'),
    ...deckFields,
  });
  const listB = r.json?.id;
  check('createList 2000 cards accepted', r.status === 200, `HTTP ${r.status} ${JSON.stringify(r.json)}`);

  r = await call('createList', idToken, {
    name: 'C-2000',
    userId: uid,
    associations: cards(2000, 'c'),
    ...deckFields,
  });
  check('createList 2000 cards accepted', r.status === 200, `HTTP ${r.status} ${JSON.stringify(r.json)}`);

  const baseline = await cardCount(uid);
  console.log(`  cardCount = ${baseline}`);
  check('baseline is 4100', baseline === 4100, `got ${baseline}`);
  if (!listA || !listB) {
    console.log('\n  No lists were created, the rest cannot run.');
    process.exit(1);
  }

  section('2. createList must not cross the ceiling');
  // 4100 + 2000 = 6100 > 5000. crud.js:115 checks canAddCards inside the
  // transaction, so this route is bounded. This is the route the original issue
  // filing wrongly accused.
  const before = await cardCount(uid);
  r = await call('createList', idToken, {
    name: 'D-2000',
    userId: uid,
    associations: cards(2000, 'd'),
    ...deckFields,
  });
  const after = await cardCount(uid);
  console.log(`  HTTP ${r.status}  ${JSON.stringify(r.json)}`);
  console.log(`  cardCount ${before} -> ${after}`);
  check('counter stayed under the ceiling', after <= PREMIUM_MAX_CARDS, `cardCount reached ${after}`);
  // The 500 rather than 400 is a separate, already filed defect: listRoutes.js
  // never imports QuotaExceededError, so its own catch block throws.
  if (r.status === 500) {
    console.log('  NOTE  HTTP 500 instead of 400. That is P1/2026-10-11-quota-exceeded-error-sin-importar.md,');
    console.log('        not this issue. The ceiling still held.');
  }

  section('3. updateList must not cross the ceiling');
  // Rewrite list A from 100 to 2000 cards. delta +1900, so 4100 -> 6000.
  // crud.js:160 calls only validateUserCardQuotaNotExceeded, which returns
  // early for Premium.
  const beforeUpd = await cardCount(uid);
  r = await call('updateList', idToken, { listId: listA, associations: cards(2000, 'a2') });
  const afterUpd = await cardCount(uid);
  console.log(`  HTTP ${r.status}  ${JSON.stringify(r.json)}`);
  console.log(`  cardCount ${beforeUpd} -> ${afterUpd}   (delta +1900)`);
  check(
    'counter stayed under the ceiling',
    afterUpd <= PREMIUM_MAX_CARDS,
    `cardCount reached ${afterUpd}, ${afterUpd - beforeUpd} cards over a ${PREMIUM_MAX_CARDS} ceiling`
  );
  if (r.status === 429) console.log(`  NOTE  ${RATE_LIMIT_NOTE}`);

  section('4. splitList must not cross the ceiling');
  // Turn list B (2000) into two lists of 2000. delta +2000.
  const beforeSplit = await cardCount(uid);
  r = await call('splitList', idToken, {
    listId: listB,
    groups: [
      { name: 'B1', associations: cards(2000, 'b1') },
      { name: 'B2', associations: cards(2000, 'b2') },
    ],
  });
  const afterSplit = await cardCount(uid);
  console.log(`  HTTP ${r.status}  ${JSON.stringify(r.json)}`);
  console.log(`  cardCount ${beforeSplit} -> ${afterSplit}   (delta +2000)`);
  check(
    'counter stayed under the ceiling',
    afterSplit <= PREMIUM_MAX_CARDS,
    `cardCount reached ${afterSplit}, ${afterSplit - beforeSplit} cards over a ${PREMIUM_MAX_CARDS} ceiling`
  );
  if (r.status === 429) console.log(`  NOTE  ${RATE_LIMIT_NOTE}`);

  section('5. The overrun does not converge');
  // Once past the ceiling the account cannot make new lists, but it can keep
  // growing the ones it has. Same route as section 4, twice more.
  const createdIds = [...(r.json?.ids ?? [])];
  let lastId = createdIds[0];
  const trail = [afterSplit];
  for (let i = 1; i <= 2; i++) {
    const s = await call('splitList', idToken, {
      listId: lastId,
      groups: [
        { name: `r${i}a`, associations: cards(2000, `r${i}a`) },
        { name: `r${i}b`, associations: cards(2000, `r${i}b`) },
      ],
    });
    if (s.status !== 200) {
      console.log(`  stopped early: HTTP ${s.status} ${JSON.stringify(s.json)}`);
      if (s.status === 429) console.log(`  NOTE  ${RATE_LIMIT_NOTE}`);
      break;
    }
    createdIds.push(...s.json.ids);
    lastId = s.json.ids[0];
    trail.push(await cardCount(uid));
  }
  console.log(`  cardCount trail: ${trail.join(' -> ')}   (ceiling ${PREMIUM_MAX_CARDS})`);
  check(
    'every repeated call added another 2000 cards',
    trail.every((v, i) => i === 0 || v === trail[i - 1] + 2000),
    `trail was ${trail.join(', ')}`
  );

  await cleanup(uid, idToken, email, [listA, listB, ...createdIds]);

  section('Summary');
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\n  The failures above are the defect. As filed on 2026-10-12 exactly two');
    console.log('  fail, in sections 3 and 4. Any other failure means something changed.');
    console.log('  A clean run means the ceiling was applied to updateList and splitList too.');
  } else {
    console.log('\n  The ceiling held on every route. The P0 is closed.');
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('reproduction crashed:', e);
  process.exit(1);
});