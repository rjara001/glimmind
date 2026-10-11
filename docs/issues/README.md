# Parked Issues

Work found during investigation that is **not** part of the task in progress.
It is real, it is not being fixed right now, and it is not lost.

Nothing in this folder blocks a business or pricing decision. Items that do
require a product decision are recorded here as facts only — the decision itself
belongs in [`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md).

Filed from the Stripe sandbox-to-live work and the business-model review
(2026-10-11).

---

## P0 — bleeding money or broken right now

| Issue | Impact |
|---|---|
| [2026-10-11-constants-rotos-ia-caida.md](2026-10-11-constants-rotos-ia-caida.md) | AI deck generation is dead in production. 8 exports deleted from `constants.js` |
| [2026-10-11-vosk-descarga-innecesaria.md](2026-10-11-vosk-descarga-innecesaria.md) | 41.2 MB downloaded by 100% of visitors. Caps the service at ~12 users/month |

## P1 — behavioural bugs

| Issue | Impact |
|---|---|
| [2026-10-11-quota-exceeded-error-sin-importar.md](2026-10-11-quota-exceeded-error-sin-importar.md) | `ReferenceError` on the quota-error path of create/edit/split list |
| [2026-10-11-log-client-error-sin-rewrite.md](2026-10-11-log-client-error-sin-rewrite.md) | Every client error is lost; one wasted request each |
| [2026-10-11-huecos-de-gating-premium.md](2026-10-11-huecos-de-gating-premium.md) | Paid features reachable from the free tier |

## P2 — debt, dead code, hygiene

| Issue | Impact |
|---|---|
| [2026-10-11-codigo-muerto-y-endpoints-sin-uso.md](2026-10-11-codigo-muerto-y-endpoints-sin-uso.md) | 5 unused services, 4 endpoints with no callers, 83 MB dead WASM |
| [2026-10-11-cuotas-invisibles-al-usuario.md](2026-10-11-cuotas-invisibles-al-usuario.md) | Users only learn their limits from a 429 |
| [2026-10-11-bugs-menores.md](2026-10-11-bugs-menores.md) | Quota misreported to premium, dropped deltas, reload re-pays first card |
| [2026-10-11-higiene-build-y-tests.md](2026-10-11-higiene-build-y-tests.md) | Clean build can 404 the voice model; jest hangs; outdated dependency |
| [2026-10-11-deuda-de-documentacion.md](2026-10-11-deuda-de-documentacion.md) | `LAUNCH_PLAN` and the API doc contradict the code |
| [2026-10-11-sin-instrumentacion-de-costos.md](2026-10-11-sin-instrumentacion-de-costos.md) | No per-user cost logging, so limits cannot be validated |

---

## Older entries

Nine issues filed before 2026-10-11 predate this index and are not yet
catalogued here: `2026-08-07-card-activity-history.md` through
`2026-08-27-gemini-vocabulary-extraction.md`. Add them on next touch.