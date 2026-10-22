# Manual validation guide — 2026-10-20 audit closeout (phases A, B, C)

**Date:** 2026-10-21
**Scope:** the docs-only closeout merged to `main` (branch `docs/audit-closeout-abc`). Four commits: A `market-positioning.md`, B the three new P2 issues + index, C the improvement roadmap + headers, plus this guide.
**Runtime impact:** none. No `src/` or `backend/` file was touched; the app behaves exactly as before. Everything below validates documents and bookkeeping, not product behaviour.
**Authoritative log:** [`plans/2026-10-21-close-audit-backlog.md`](./plans/2026-10-21-close-audit-backlog.md) §6.1 holds the same evidence in machine form.

## How to use

Run every command from the repository root. Each step states the command and the expected output. Budget ≈ 10 minutes without the optional online checks.

---

## 0. Preconditions

```bash
git log --oneline -5
git status --short
```

Expected: the four closeout commits appear on top of `88c38f8` (PR #8), and the working tree is clean (this guide may be dirty only if you edited it).

Optional re-run of the automated gates (AGENTS §34):

```bash
npx tsc --noEmit          # expected: empty output, exit 0
npx vitest run            # expected: 85 files / 977 tests passed as of 2026-10-21
```

---

## 1. Phase A — verified market research (`market-positioning.md`)

```bash
grep -n "2.6 Verified competitor" docs/audits/2026-10-20-market-positioning.md
```

Expected: exactly 1 hit (the new subsection).

```bash
grep -n "4.1 Target keyword surface" docs/audits/2026-10-20-market-positioning.md
grep -c "unverified" docs/audits/2026-10-20-market-positioning.md
```

Expected: 1 hit for §4.1; ≥ 7 occurrences of *unverified* (every keyword volume is marked, nothing is guessed).

```bash
grep -n "Competitors schedule in the dark" docs/audits/2026-10-20-market-positioning.md
```

Expected: 1 hit — the 4-cycle/FSRS contrast from the cycle era survived the rewrite.

Manual reading checks:

1. §2.6 contains **5 rows** (Anki, Quizlet, Memrise, Duolingo, Glimmind); every external figure carries a source URL and the retrieval date **2026-10-21**; Duolingo Max is marked *unverified*; the Glimmind row points to `LandingPage.tsx:239`, `stripeService.js:76` and states it is a shipped fact, **not** a pricing decision.
2. No pricing decision was written: `git log --oneline -3 -- docs/BUSINESS_MODEL.md` — the last change to that file must **not** be one of the closeout commits.

Optional online spot-check (prices drift; a mismatch later is not a defect — update the audit with a new retrieval date):

| Open | Expect near |
|---|---|
| [apps.apple.com/us/app/ankimobile-flashcards/id373493387](https://apps.apple.com/us/app/ankimobile-flashcards/id373493387) | $24.99 |
| [quizlet.com/upgrade](https://quizlet.com/upgrade) | Plus $35.99/yr, Unlimited $44.99/yr, Family $83.99/yr |
| [app.memrise.com/payment/plans/en](https://app.memrise.com/payment/plans/en) | $24.99/mo, $61.99/yr, $329.99 lifetime |
| [play.google.com/store/apps/details?id=com.duolingo](https://play.google.com/store/apps/details?id=com.duolingo) | 4.7★, 50M+ downloads |

---

## 2. Phase B — three P2 issues, index and audit sync

> Note (2026-10-22): `ui-mezcla-tres-idiomas-sin-switcher.md` was elevated to
> `docs/issues/P1/` when U-13 was promoted and planned; the command below is
> the validation as it ran on 2026-10-21.

```bash
ls docs/issues/P2/2026-10-21-gameview-sin-estado-de-error.md \
   docs/issues/P2/2026-10-21-ui-mezcla-tres-idiomas-sin-switcher.md \
   docs/issues/P2/2026-10-21-guest-ve-tienda-de-mazos-vacia.md
```

Expected: the three files listed, no error.

Open each file: sections **What / Impact / Evidence / Fix** present, `Status: Not fixed`, source audit referenced (AGENTS §44).

```bash
grep -n "Counts as of" docs/issues/README.md
ls docs/issues/P2 | wc -l
grep -oE '\[`P2/[^`]+`\]' docs/issues/README.md | sort -u | wc -l
```

Expected: counts line reads `0 P0 · 9 P1 · 26 P2 · 24 done · 3 backlog`; directory count and unique README rows both = **26**.

Row-per-file parity (expected: no output):

```bash
for f in docs/issues/P2/*.md; do b=$(basename "$f"); grep -q "P2/$b" docs/issues/README.md || echo "MISSING ROW: $b"; done
```

Audit register in `usability-gaps.md` (expected: 1 hit each, and the new count note):

```bash
grep -n "2026-10-21-gameview\|2026-10-21-ui-mezcla\|2026-10-21-guest-ve" docs/audits/2026-10-20-usability-gaps.md
grep -n "All 7 new findings" docs/audits/2026-10-20-usability-gaps.md
```

---

## 3. Phase C — the improvement roadmap

```bash
grep -cE '^\| (U|AS|MP)-[0-9]+' docs/audits/2026-10-20-improvement-roadmap.md
```

Expected: **34** (20 U + 5 AS + 9 MP; selection rules in roadmap §1).

U-register parity — every U gap appears exactly once in both documents (expected: no diff output):

```bash
diff <(grep -oE '^\| U-[0-9]+' docs/audits/2026-10-20-usability-gaps.md | sort) \
     <(grep -oE '^\| U-[0-9]+' docs/audits/2026-10-20-improvement-roadmap.md | sort)
```

Status distribution (expected: `filed 20`, `planned 9`, `open 3`, `done 2`):

```bash
grep -oE '\| (filed|planned|open|done) \|' docs/audits/2026-10-20-improvement-roadmap.md | sort | uniq -c
```

No duplicate IDs (expected: no output):

```bash
grep -oE '^\| (U-[0-9]+|AS-[0-9]+|MP-[0-9]+)' docs/audits/2026-10-20-improvement-roadmap.md | sort | uniq -d
```

Link existence — every `docs/…md` reference resolves (expected: no `FALTA` lines):

```bash
grep -oE '`docs/[^`]+\.md`' docs/audits/2026-10-20-improvement-roadmap.md | tr -d '`' | sort -u | while read p; do [ -e "$p" ] || echo "FALTA: $p"; done
```

Sibling links — all three audits point at the roadmap (expected: the three audit file names):

```bash
grep -l "improvement-roadmap" docs/audits/*.md
```

Manual reading checks: row **AS-05** is `done` and links the FSRS rejection (`BUSINESS_MODEL.md` §7); row **MP-09** is `done` and links §2.4–§2.6 of the market audit; no row claims a fix that has not happened.

---

## 4. Git hygiene

```bash
git diff --name-only 88c38f8..HEAD | grep -v "^docs/" || echo "docs-only OK"
git log --oneline 88c38f8..HEAD
```

Expected: `docs-only OK` (nothing outside `docs/`); four commits with the planned messages (A, B, C, guide).

---

## 5. Out of scope — do not validate here

- Product behaviour, UI or tests beyond the optional §0 re-run: nothing in the app changed.
- The 9 open P1 issues and every roadmap row with status `filed`/`planned`/`open`: the roadmap only records them; fixing them requires its own plan (AGENTS §12/§44).
- External price accuracy months from now: the audit freezes a retrieval date; refresh it deliberately, do not "fail" the doc for drift.

## 6. If a check fails

1. Counts or parity mismatch → re-run the mechanical commands in the plan's §6.1 log and compare.
2. A broken internal link → fix the path **and** keep `docs/issues/README.md` in sync (AGENTS §44).
3. A real defect discovered while validating → park it as a new issue under `docs/issues/P2/` (or the right priority folder); do not fix it inside this validation pass (AGENTS §12/§44).
