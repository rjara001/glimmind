# Landing comparison card attributes cycle entry to a failure

## What

`src/components/views/LandingPage.tsx:148` (the "La palabra no desaparece" card under "Por qué Glimmind") reads: *"En otras apps fallas una vez y la palabra se va. Aquí entra a un ciclo."* The sentence frames **failing** as the event that makes a word enter a cycle. The engine only advances `currentCycle` on `PASS` ("Siguiente"); a failed validation never changes it (`src/services/gameEngine.ts` `processAction`, `docs/cycle-progression-rules.md:16,39`).

## Impact

Public landing copy repeats the exact framing that Phase 1 of `docs/plans/2026-10-20-cycle-presentation-clarity.md` removed from the cycle section (old `LandingPage.tsx:42`). The transparency positioning — "the rule on screen is the real rule" — is weakened: a visitor can read that failing moves words forward. No numeric impact; copy accuracy only.

## Evidence

- `src/components/views/LandingPage.tsx:148` — *"fallas una vez … Aquí entra a un ciclo"*
- `src/components/views/LandingPage.tsx:43-44` — corrected framing in the cycle section (*"Con Siguiente la palabra sube de ciclo"*)
- `tests/components/LandingPage.test.tsx:28-35` — forbids `falla →` and `Fallaste`, but not this sentence
- Origin: `8aa1391 feat: implement new landing page look and feel` (predates the 2026-10-20 plan, which cited only line 42)

## Fix

Reword the card so persistence and advancement come from `Siguiente`, e.g. *"Aquí no: se queda en su ciclo y sube con Siguiente hasta que se fija."* Extend `tests/components/LandingPage.test.tsx` with a negative assertion for the failure-attributed framing.
