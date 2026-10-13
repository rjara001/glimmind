// Seeds a Premium account at 4900 cards so the P0 can be seen with your own eyes
// in the browser, not just in a terminal.
//
//   Terminal 1:  npm run emulators
//   Terminal 2:  npm run dev          (http://localhost:5173)
//   Terminal 3:  node scripts/seed-p0-premium-demo.mjs
//
// Then log in with the credentials it prints, open the list called
// "Vocabulario C", bulk-add cards, save, and watch Settings read
// "5100/5000 tarjetas".
//
//   node scripts/seed-p0-premium-demo.mjs --reset   removes everything again
//
// The lists are written straight into Firestore, bypassing createList, so the
// seed itself does not need to pass the 5000 ceiling. That is the point: the
// ceiling does not exist on every route (see the P0 issue).

import { createRequire } from 'node:module';

const PROJECT = 'fladycard-22a3e';
const AUTH = 'http://localhost:9099';
const FS = 'http://localhost:9080';

const EMAIL = 'premium.p0@local.test';
const PASSWORD = 'p0repro123';

const PREMIUM_MAX_CARDS = 5000;

// Left room above the ceiling so one edit crosses it, but not so much that the
// dashboard has to render an unmanageable amount of rows.
const LISTS = [
  { name: 'Vocabulario A', cards: 2000, tag: 'a', editable: false },
  { name: 'Vocabulario B', cards: 2000, tag: 'b', editable: false },
  { name: 'Vocabulario C', cards: 900, tag: 'c', editable: true },
];

const doc = (p) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`;
const headers = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

// firebase-admin only exists under backend/src/functions, which is what the
// emulator itself loads. Resolve it from there rather than adding a dependency.
const require = createRequire('/Users/rodrigo.jara/dev-personal/glimmind/backend/src/functions/package.json');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:9080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = PROJECT;

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore(initializeApp({ projectId: PROJECT }));

function cards(n, tag) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${tag}-${i}`,
    term: `${tag}${i}`,
    definition: [`definicion de ${tag}${i}`],
    context: '',
    currentCycle: 0,
    status: 'pending',
    isLearned: false,
    isArchived: false,
    hits: 0,
    misses: 0,
    timesPlayed: 0,
  }));
}

const settings = {
  mode: 'normal',
  flipOrder: 'normal',
  threshold: 0.8,
  ignoreArticles: true,
  showHints: true,
  hintMode: false,
  voiceEnabled: false,
};

// The auth emulator exposes no account-listing endpoint, so the uid comes from
// the id token's own payload. Signing in also tells us the account already
// exists, which is how re-running the seed is made idempotent.
async function signIn() {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  const json = await res.json();
  return json.idToken ?? null;
}

function uidFromToken(idToken) {
  const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
  return payload.user_id ?? payload.uid ?? payload.sub;
}

async function ensureUser() {
  const token = await signIn();
  if (token) return { uid: uidFromToken(token), created: false };

  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!json.idToken) throw new Error(`could not create user: ${JSON.stringify(json)}`);
  return { uid: uidFromToken(json.idToken), created: true };
}

async function reset(uid) {
  const snap = await db.collection('lists').where('userId', '==', uid).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.doc(`users/${uid}/meta/main`));
  batch.delete(db.doc(`users/${uid}`));
  await batch.commit();
  return snap.size;
}

async function seed(uid) {
  const total = LISTS.reduce((s, l) => s + l.cards, 0);
  const now = new Date();

  const batch = db.batch();
  const ids = [];
  for (const spec of LISTS) {
    const ref = db.collection('lists').doc();
    ids.push(ref.id);
    batch.set(ref, {
      userId: uid,
      name: spec.name,
      concept: `Seed P0 ${spec.tag}`,
      associations: cards(spec.cards, spec.tag),
      settings,
      sourceType: 'manual',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });
  }
  batch.set(db.doc(`users/${uid}/meta/main`), {
    tier: 'premium',
    // What SettingsView prints as the denominator. Matches plans.json so the
    // number that goes over the top is the declared ceiling, not a stale field.
    cardQuota: PREMIUM_MAX_CARDS,
    cardCount: total,
    aiQuotaDaily: 1000,
    aiUsedToday: 0,
    aiDateKey: '',
    ytAiUsedToday: 0,
    ytAiDateKey: '',
    translationCharsUsed: 0,
    updatedAt: now,
  });
  await batch.commit();
  return { total, ids };
}

async function main() {
  const resetMode = process.argv.includes('--reset');

  const fsUp = await fetch(`${FS}/`).then(() => true).catch(() => false);
  if (!fsUp) {
    console.error('Emulators are not up. Run:  npm run emulators');
    process.exit(1);
  }

  const { uid, created } = await ensureUser();

  if (resetMode) {
    const n = await reset(uid);
    console.log(`Removed ${n} lists and the meta doc for ${EMAIL} (${uid}).`);
    console.log('The auth user stays, so you can log in again and see an empty account.');
    process.exit(0);
  }

  const existing = await cardCount(uid);
  if (existing > 0) await reset(uid);
  const seeded = await seed(uid);

  console.log(`
Seeded. Nothing left the machine.

  login     ${EMAIL}
  password  ${PASSWORD}
  uid       ${uid}   (${created ? 'new user' : 'existing user, lists replaced'})
  account   ${seeded.total} cards across ${LISTS.length} lists
  ceiling   ${PREMIUM_MAX_CARDS}   (plans.json tiers.premium.maxCards)

What to do next

  1. open http://localhost:5173/login   (npm run dev must be running)
  2. log in with the credentials above
  3. Dashboard -> the card "Vocabulario C" -> Editar
  4. in the editor, toggle the bulk panel, paste these lines and add them:

term-1,definition one,
term-2,definition two,
term-3,definition three,

     ...any number of lines, one per card. 200 lines is enough.
  5. press Guardar. The toast says "Lista guardada".
  6. open Settings. It reads:

     Estado actual: ${seeded.total + 200}/${PREMIUM_MAX_CARDS} tarjetas

     A Premium account holding more cards than the Premium ceiling.

The contrast, if you want to see the other half

  Edit "Vocabulario C" only. Leave A and B alone.
  Then go back to the dashboard and create a NEW list with 2000 cards from this
  same account. It is refused. Same account, same tier, same ceiling, different
  route: createList checks it, updateList does not.

To undo

  node scripts/seed-p0-premium-demo.mjs --reset
`);
}

async function cardCount(uid) {
  const s = await db.doc(`users/${uid}/meta/main`).get();
  return s.exists ? Number(s.data().cardCount ?? 0) : 0;
}

main().catch((e) => {
  console.error('seed crashed:', e);
  process.exit(1);
});