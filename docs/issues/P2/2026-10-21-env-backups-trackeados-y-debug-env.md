# Tracked .env backup files and a stray debug script

## What

Three environment-adjacent artifacts are committed to git: `.env.local.backup`
(contains the real Firebase web configuration, commit `cb50750`),
`.env.backup` (a 12,979-line wordlist/changelog that is not an env file at all,
misleadingly named), and `backend/src/functions/debug-env.js` (a stray debug
script that prints environment key names). The `.gitignore` rules (`.env.*`,
`*.local`) were meant to keep env material out of the repo, but files committed
before those rules stay tracked forever.

## Impact

`.env.local.backup` holds the public Firebase web config (`VITE_FIREBASE_API_KEY=AIzaSy…`,
project `fladycard-22a3e`). That key is not a server secret, but tracking it
violates the repo's own ignore intent and trains both humans and agents to treat
backups of env files as safe-to-commit. `.env.backup` looks like a secret file
to any scanner or auditor (it is actually a wordlist) and creates audit noise on
every secrets sweep — it already showed up in the 2026-10-21 launch-plan audit.
`debug-env.js` is dead code at the backend root.

## Evidence

- `git ls-files | grep -i env` → `.env.backup`, `.env.local.backup` tracked (plus
  legitimate `.env.example` files and `vite-env.d.ts`)
- `grep -c "AIza" .env.local.backup` → 1
- `wc -l .env.backup` → 12979; `head -3` → `Glimmind / v1.2.0 / Agregar` (wordlist)
- `.gitignore:34` → `.env.*`, `.gitignore:13` → `*.local` (arrived after commit `cb50750`)
- `backend/src/functions/debug-env.js:1-6` → prints `FIRESTORE_EMULATOR_HOST` and friends
- Full-history scan for `.env`/`.secret.local` is empty: no real secret was ever committed

## Fix

`git rm --cached .env.local.backup .env.backup backend/src/functions/debug-env.js`
(keep the files locally if still useful, rename `.env.backup` to something that
does not read as env material), then verify `git ls-files | grep -i env` only
returns the intentional `.env.example` files.
