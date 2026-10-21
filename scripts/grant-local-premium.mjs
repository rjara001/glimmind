// Grants or revokes Premium on a LOCAL account in the Auth/Firestore emulators.
// It cannot touch production: the emulator hosts are hardcoded and the script
// refuses to run when the emulators are down.
//
//   Terminal 1:  npm run emulators
//   Terminal 2:  npm run grant:premium -- --uid <uid>
//                npm run grant:premium -- --email you@example.com
//                npm run grant:premium -- --uid <uid> --revoke
//
// How to find your local uid: with the app open on http://localhost:3001,
// run `auth.currentUser.uid` in the browser console (or `useGameStore` state).
//
// --email resolves the uid via admin.auth().listUsers() against the Auth
// emulator. Older emulator builds do not expose the listing endpoint; when
// that happens the script exits with instructions to use --uid instead.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PROJECT = 'fladycard-22a3e';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:9080';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANS_PATH = path.resolve(
  __dirname,
  '../backend/src/functions/src/config/plans.json',
);
const FUNCTIONS_DIR = path.resolve(__dirname, '../backend/src/functions');

// Forcing the emulator hosts here is the local-only guarantee: firebase-admin
// has no other way to reach Firestore/Auth, so even a stray production env var
// elsewhere cannot make this script write outside this machine.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:9080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = PROJECT;

function parseArgs(argv) {
  const args = { uid: null, email: null, revoke: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--uid') {
      args.uid = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === '--email') {
      args.email = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === '--revoke') {
      args.revoke = true;
    } else {
      return null;
    }
  }
  if (args.uid && args.email) return null;
  if (!args.uid && !args.email) return null;
  if (args.uid !== null && args.uid.startsWith('--')) return null;
  if (args.email !== null && args.email.startsWith('--')) return null;
  return args;
}

function usage() {
  console.error(`
Grants or revokes Premium for one account in the LOCAL emulators.

  node scripts/grant-local-premium.mjs --uid <uid> [--revoke]
  node scripts/grant-local-premium.mjs --email <email> [--revoke]

  --uid <uid>      target uid (see below). Preferred; always works.
  --email <email>  resolves the uid via the Auth emulator's user list.
  --revoke         sets the account back to free instead.

Finding your local uid: with the app on http://localhost:3001, run

  auth.currentUser.uid

in the browser console. Requires npm run emulators in another terminal.
`);
}

function loadPlans() {
  return JSON.parse(readFileSync(PLANS_PATH, 'utf8'));
}

async function ensureEmulatorsUp() {
  const fsUp = await fetch(`${FS}/`)
    .then(() => true)
    .catch(() => false);
  const authUp = await fetch(`${AUTH}/`)
    .then(() => true)
    .catch(() => false);
  if (!fsUp || !authUp) {
    console.error('Emulators are not up. Run:  npm run emulators');
    process.exit(1);
  }
}

async function resolveUidByEmail(require, email) {
  const { getApps } = require('firebase-admin/app');
  if (getApps().length === 0) {
    console.error('firebase-admin was not initialized');
    process.exit(1);
  }
  const { getAuth } = require('firebase-admin/auth');
  try {
    const list = await getAuth().listUsers();
    const match = list.users.find((u) => u.email === email);
    return match ? match.uid : null;
  } catch (error) {
    const reason = error?.message ?? String(error);
    console.error(`Could not list users on the Auth emulator: ${reason}`);
    console.error(
      'Your emulator build may not expose account listing. Use --uid instead ' +
        "(run auth.currentUser.uid in the app's browser console).",
    );
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    usage();
    process.exit(1);
  }

  await ensureEmulatorsUp();

  const plans = loadPlans();
  const premium = plans.tiers.premium;
  const free = plans.tiers.free;

  const require = createRequire(path.join(FUNCTIONS_DIR, 'package.json'));
  const { initializeApp, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');

  if (getApps().length === 0) {
    initializeApp({ projectId: PROJECT });
  }
  const db = getFirestore();

  let uid = args.uid;
  if (!uid) {
    uid = await resolveUidByEmail(require, args.email);
    if (!uid) {
      console.error(
        `No user with email ${args.email} on the local Auth emulator.`,
      );
      process.exit(1);
    }
  }

  const ref = db.doc(`users/${uid}/meta/main`);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(
      `users/${uid}/meta/main does not exist. Log in once at http://localhost:3001 so getQuota creates it, then re-run.`,
    );
    process.exit(1);
  }

  if (args.revoke) {
    await ref.set(
      {
        tier: 'free',
        cardQuota: free.maxCards,
        aiQuotaDaily: free.aiDailyLimit,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    console.log(
      `Revoked Premium for ${uid} (now free, ceiling ${free.maxCards}).`,
    );
    console.log('Reload the app: quota is read once at bootstrap.');
    return;
  }

  await ref.set(
    {
      tier: 'premium',
      cardQuota: premium.maxCards,
      aiQuotaDaily: premium.aiDailyLimit,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  console.log(`
Premium granted to ${uid}
  tier          premium
  cardQuota     ${premium.maxCards}   (plans.json tiers.premium.maxCards)
  aiQuotaDaily  ${premium.aiDailyLimit}   (plans.json tiers.premium.aiDailyLimit)

Reload the app (quota is read once at bootstrap). "Grabar Voz" appears in the
game header. This is local only; nothing left the machine.
`);
}

main().catch((e) => {
  console.error('grant-local-premium crashed:', e);
  process.exit(1);
});
