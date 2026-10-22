# Mixed-language UI (neutral ES / AR-ES / EN) with no switcher

**Date:** 2026-10-21
**Status:** Not fixed — **elevated P2 → P1 on 2026-10-22** (U-13: prerequisite
for any i18n work and for the `en` rollout; `usability-gaps.md` §8 order 5
already ranks it alongside U-11 as the gate for every locale)
**Source:** `docs/audits/2026-10-20-usability-gaps.md` §4 (U-13)
**Plan:** [`../../plans/2026-10-22-i18n-plan.md`](../../plans/2026-10-22-i18n-plan.md)

## What

The product speaks three variants of two languages on the same screens: neutral Spanish (most of the UI), Argentine Spanish in onboarding micro-copy ("Preferís", "Creá", "Explorá" in `docs/ONBOARDING-UX-DESIGN.md:206-213`), and English strings in loading states, navbar, guest banner and raw errors (`Loading...`, `Dashboard`, `History`, `Settings`). There is no language switcher and `<html lang="es">` is hard-coded (`src/index.html:3`), so screen readers and search engines are told one language only.

## Impact

- For a Spanish speaker outside Argentina the voseo reads as imported copy; for an English visitor nothing is legible.
- It is a prerequisite for any i18n work (`usability-gaps.md` §8, order 5, together with U-11) and for the `en` rollout gate in `docs/audits/2026-10-20-market-positioning.md` §5.
- `hreflang`/SEO work cannot start until `lang` is driven by locale.

## Evidence

```
$ grep -n 'lang="es"' src/index.html
3:<html lang="es">

$ grep -rn "Loading\.\.\." src/components/
src/components/ProtectedRoute.tsx:35:  <span ...>Loading...</span>
src/components/views/GameView.tsx:274:  <div ...>Loading...</div>

$ grep -rn "Preferís\|Creá\|Explorá" src/
src/components/onboarding/CustomCreationSection.tsx:10:  ¿Preferís cargar tu propio material?
src/components/onboarding/CustomCreationSection.tsx:11:  Creá tu propia lista con el método que prefieras.
src/components/onboarding/DeckStoreOnboarding.tsx:157:  Explorá nuestro catálogo...
```

`docs/audits/2026-10-20-usability-gaps.md` §4 lists the exact split of locations.

## Fix

Tracked by [`docs/plans/2026-10-22-i18n-plan.md`](../../plans/2026-10-22-i18n-plan.md)
(phases P0–P6). Short term (before any i18n library): normalise every string to
neutral Spanish and delete the English ones. Full path: i18n phase of
`docs/audits/2026-10-20-market-positioning.md` §5 (I-1 library → I-2 extraction
→ I-3 neutral ES → I-4 switcher + dynamic `lang`).
