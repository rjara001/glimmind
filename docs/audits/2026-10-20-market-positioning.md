# Market Positioning and Organic Presence Audit

**Date:** 2026-10-20
**Updated:** 2026-10-21 — Phase A of `docs/plans/2026-10-21-close-audit-backlog.md`: §2.6 (verified competitor prices) and §4.1 (keyword shortlist) added from research retrieved 2026-10-21; all other sections unchanged.
**Goal:** position Glimmind as a credible international alternative in the learning market.
**Budget constraint:** organic only (SEO, content, product-led growth). No paid acquisition.
**Priority order agreed:** usability first, then market.
**Sibling documents:** [`2026-10-20-app-state.md`](./2026-10-20-app-state.md), [`2026-10-20-usability-gaps.md`](./2026-10-20-usability-gaps.md), [`2026-10-20-improvement-roadmap.md`](./2026-10-20-improvement-roadmap.md).

---

## 1. Where the product stands today

| Dimension | State | Evidence |
|---|---|---|
| Search visibility | none | no `meta description`, no OG tags, no canonical, no JSON-LD, no `sitemap.xml`, no `robots.txt`, no favicon — verified in `src/index.html` and `dist/index.html` (1773 B) |
| Indexable surface | one page | `/` is the only public route with content; `/privacy`, `/terms`, `/cookies` are static views |
| Content marketing | none | no blog, no guides, no changelog reachable from the app |
| Analytics / funnel | none | `docs/instrumentation-plan.md` covers **errors only**; no signup, activation or payment events |
| Language coverage | 1 | `lang="es"` hard-coded (`src/index.html:2`); 0 i18n files, 0 i18n libraries |
| Positioning statement | one line | "Mientras Duolingo te da puntos, Glimmind te hace recordar" (`src/components/views/LandingPage.tsx:23`) |
| Competitive analysis | none | `docs/PLAN_NEW_LOOK_AND_FEEL.md` §7 names Duolingo only |
| Proof | none | no testimonials, no usage numbers, no reviews |
| Real users | 0 | `docs/BUSINESS_MODEL.md` |

**Verdict:** the product is materially further ahead than its market surface. The engine, the tiers and payments work; nobody can find the page, nobody can read it in their language, and the page that exists over-promises.

---

## 2. Positioning framework

### 2.1 Category

Not "language learning" — that category is owned and will be outranked for a decade.
The defensible category is **vocabulary retention for adults who already have a source of words** (a course, a job, a textbook, a trip) and need them to *stay in memory*.

### 2.2 Differentiators that are true today

| Differentiator | Verifiable in code | Weakness |
|---|---|---|
| **Transparent 4-cycle progression (New → Seen → Recognized → Frequent → Learned): the state of every word and the rule that moves it are on screen** | `src/services/gameEngine.ts`, `glimmind-engine.md`, `src/utils/cycle-rules.ts` | cycles have no intervals; calling it spaced repetition would be false |
| Fuzzy-match grading with a similarity percentage, not pass/fail | Levenshtein engine, similarity toasts (`AGENTS.md` §32 protects them) | none |
| Own the words you actually need: import from YouTube, CSV, pasted text, keyword extraction | `src/hooks/` creation flows | none |
| Voice: on-device by default, cloud HD for Premium | `src/hooks/voice/`, `src/services/voice/` | cloud gated behind Premium |
| Free tier costs the operator nothing (all on-device) | `docs/BUSINESS_MODEL.md` Rule 0 | none — genuinely rare, worth marketing |
| One-time price, not a subscription | Stripe `price_...` one-time, EUR 4.99 | not localised |
| Works offline-ish, installable on iOS/Android | Capacitor scaffolded, PWA **not configured** | U-16 |

### 2.3 Differentiators claimed but not true (must not be marketed)

Export, advanced statistics, priority support, exam mode, spaced-repetition intervals, multi-device sync.
Full list: `docs/SERVICE_CATALOG.md` §7 and `2026-10-20-usability-gaps.md` U-19.

### 2.4 Proposed statement of positioning

> Glimmind helps adults keep the vocabulary they already started learning. Bring your own words, say them out loud, and move them through four cycles until they stick — with the state of every word visible on screen instead of hidden behind a scheduling algorithm. One payment, no subscription, nothing to memorise about the app itself.

### 2.5 Competitive frame

| Competitor | Their strength | Where Glimmind is genuinely different |
|---|---|---|
| Duolingo | habit loops, brand, free volume | Glimmind does not teach a scripted course; it retains *your* vocabulary |
| Anki | SRS depth, power users, free | Anki has no voice, no fuzzy grading, brutal UX; Glimmind is approachable |
| Memrise | video/mnemonic content, brand | Glimmind imports from *your* sources (YouTube, CSV, paste) |
| Quizlet | library scale, schools, collaboration | Glimmind has no library to compete on; it competes on grading quality and voice |
| ChatGPT / AI tutors | general purpose, huge reach | Glimmind is a *system* (cycles + grading + voice), not a chat |

**Competitors schedule in the dark.** Anki (FSRS/SM-2), Quizlet, Memrise and Duolingo decide what comes back and when inside models the user never sees, so "why did this word return?" has no on-screen answer. Glimmind states its rule on screen and shows the cycle count of every word: the user can see where each word is and why.

**Do not** position on content volume or course breadth — every incumbent wins there.
**Do** position on: retention of user-owned vocabulary + voice + honest one-time pricing.

### 2.6 Verified competitor prices and proof (retrieved 2026-10-21)

Every figure below was read from the linked source on 2026-10-21. Google Play ratings vary by locale/capture; ranges are given when captures disagreed. Anything that could not be confirmed from an official source is marked *unverified*.

| Competitor | Free tier | Paid price (official source) | Store proof (retrieved 2026-10-21) | Source |
|---|---|---|---|---|
| Anki (desktop, web, AnkiDroid) | full-featured, open source, no ads | AnkiMobile (iOS): **$24.99 one-time** (US; $23.86–$33.67 across regions) | AnkiDroid: 4.7–4.8★, ~166K reviews, 10M+ downloads (Play Store). AnkiMobile: 4.0★, 2,363 ratings, #1 Top Paid Education US | [apps.ankiweb.net](https://apps.ankiweb.net/); [Play Store AnkiDroid](https://play.google.com/store/apps/details?id=com.ichi2.anki); [App Store AnkiMobile](https://apps.apple.com/us/app/ankimobile-flashcards/id373493387); [regional prices, opentherank 2026-10-14](https://opentherank.com/education-pricing/ankimobile/); [AppBrain 2026-10-17](https://www.appbrain.com/appstore/ankimobile-flashcards/ios-373493387) |
| Quizlet | yes, with ads and caps | Plus **$35.99/yr** ($2.99/mo billed annually; $7.99/mo monthly). Plus Unlimited **$44.99/yr** ($3.75/mo billed annually). Family **$83.99/yr**, up to 5 accounts | 4.4–4.7★, ~918K reviews, 50M+ downloads (locale-dependent captures) | [quizlet.com/upgrade](https://quizlet.com/upgrade); [Play Store Quizlet](https://play.google.com/store/apps/details?id=com.quizlet.quizletandroid) |
| Memrise | yes, with ads and gated explanations | **$24.99/mo**; **$61.99/yr** ($5.17/mo, "save 79%"); Lifetime **$329.99** one-time | 4.4–4.5★ typical (captures 4.2–4.7), ~1.57M reviews, 50M+ downloads | [app.memrise.com/payment/plans/en](https://app.memrise.com/payment/plans/en); [Play Store Memrise](https://play.google.com/store/apps/details?id=com.memrise.android.memrisecompanion) |
| Duolingo | full course free, ads + daily Energy limit | Super **$83.99/yr** (Google Play US, after 14-day trial); App Store US lists six unlabelled Super items ($9.99, $12.99, $79.99, $83.99, $95.99, $119.99). Family **$119.99/yr**, up to 6. Max: **not published** — third-party reports $29.99/mo or ~$167.99–168/yr (*unverified*) | 4.7★, 51.2M reviews, 500M+ downloads, #1 top grossing Education | [Play Store Duolingo](https://play.google.com/store/apps/details?id=com.duolingo); [onlinecourseing 2026-09-27](https://onlinecourseing.com/duolingo-super-cost/); [mindomax 2026-10-13](https://www.mindomax.com/duolingo-cost); [nibble 2026-06-20 (Max, unverified)](https://nibble-app.com/blog/is-duolingo-max-worth-it) |
| Glimmind (us) | free tier costs the operator $0 (all on-device) | Premium **€4.99 one-time** — current shipped price, read from code; *not* a pricing decision (`docs/BUSINESS_MODEL.md` §8 owns those) | 0 real users, no reviews (`docs/BUSINESS_MODEL.md`) | `src/components/views/LandingPage.tsx:239`; `backend/src/functions/src/services/stripeService.js:76` |

**What the verified numbers change in §2.5:**

- **One-time pricing is a real, scarce axis.** The only paid one-time model among direct competitors is AnkiMobile at $24.99 (iOS only; the rest of Anki is free). Glimmind's shipped €4.99 one-time is ~5× cheaper than AnkiMobile and replaces the subscription model of Quizlet, Memrise and Duolingo. The differentiator in §2.2 ("One-time price, not a subscription") is now quantified against the market.
- **Price transparency is itself differentiating.** Quizlet, Memrise, Anki and Glimmind publish prices publicly; Duolingo does not — its Super page shows no price until login and reviewers note "a price list that Duolingo never publishes" (mindomax 2026-10-13; onlinecourseing 2026-09-27). This parallels the scheduling-opacity claim above: incumbents keep both the price and the algorithm out of sight; Glimmind shows both.
- **Proof asymmetry is extreme and must not be faked.** Competitors carry 166K–51.2M reviews; Glimmind has none. §2.5 differentiation must rest on verifiable code behaviour (§2.2), never on social proof, until §9's credibility phase delivers real testimonials.

---

## 3. Audience (ICP)

Primary, in descending priority:

| Segment | Language | Why they come | Entry keyword intent |
|---|---|---|---|
| Adult self-directed language learners (25-45) | EN, ES, PT | have a word list that keeps evaporating | "vocabulary retention", "words won't stick" |
| Exam candidates (DELE, CELI, DELF, JLPT, TOEFL, IELTS) | ES, FR, DE, JA, EN | need recall under time pressure | "<exam> vocabulary list" |
| Professionals learning domain vocabulary (medicine, law, aviation, sales) | EN | job-driven, will pay once | "medical vocabulary flashcards" |
| Heritage speakers and expatriates | EN↔ES, EN↔PT | specific word gaps | "spanish words I keep forgetting" |

Secondary: teachers/tutors who want to hand a deck to students (needs "publish deck", currently unimplemented — `docs/SERVICE_CATALOG.md` §7).

---

## 4. SEO baseline — zero today

Verified absent from `src/index.html` and from the built `dist/index.html`:

| Element | Status |
|---|---|
| `<meta name="description">` | missing |
| Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) | missing |
| Twitter card | missing |
| `<link rel="canonical">` | missing |
| JSON-LD (`SoftwareApplication`, `FAQPage`, `Organization`) | missing |
| `<link rel="icon">` / `apple-touch-icon` | missing — `public/` holds only `models/` and two legal HTML files |
| `public/robots.txt` | missing |
| `public/sitemap.xml` | missing |
| `hreflang` per language | missing (no i18n yet) |
| Per-route `<title>` | impossible as-is: single SPA `index.html` served for every route via `firebase.json` SPA rewrite |

Additional structural issues:

- **SPA title/meta.** The Firebase rewrite `** → /index.html` (`firebase.json`) means every route returns identical HTML. Google executes JS, but social scrapers and many crawlers do not. Per-route titles need either (a) client-side injection plus prerendered entries for the handful of public routes, or (b) static HTML files for `/`, `/privacy`, `/terms`, `/cookies` served before the rewrite.
- **Two legal documents exist twice**: React views (`src/components/views/PrivacyPolicy.tsx` etc.) and static files in `public/`. Search engines may index `public/privacy-policy.html` and `/privacy` as separate, competing pages.
- **Tailwind via CDN** (`docs/issues/P1/2026-10-20-tailwind-cdn-en-runtime-produccion.md`) delays first paint, which is a Core Web Vitals risk on top of the availability risk.
- **Bundle weight**: `dist/` carries `onnx/` (83 MB, unused — `docs/issues/P2/2026-10-11-codigo-muerto-y-endpoints-sin-uso.md`) and `models/` (41 MB). Neither blocks SEO directly, but both penalise the crawl budget story and real-user load metrics.

Baseline re-verified 2026-10-21: `grep -c -E 'og:|meta name="description"|canonical|application/ld\+json|rel="icon"' src/index.html` → `0`; `public/` still holds only `models/` and the two legal HTML files.

### 4.1 Target keyword surface (added 2026-10-21)

Shortlist from Phase A research (`docs/plans/2026-10-21-close-audit-backlog.md` A-1). No keyword-tool access exists in this repository: **search volumes and difficulty are `unverified` for every row**; the "evidence" column proves the query family is live (SERP content, competitor positioning), not its size.

| Query family | Intent | Evidence it is live (all retrieved 2026-10-21) | Volume / difficulty | Target route |
|---|---|---|---|---|
| "anki alternative" | comparison / commercial | category is bought by competitors as App Store subtitles ("Study Smart - Anki Alternative", "Anki and Quizlet Alternative", "Quizlet & Anki Alternative"); GitHub topic [`anki-alternative`](https://github.com/topics/anki-alternative); 2026 roundups ([Voovo](https://www.voovostudy.com/study-blog/best-anki-alternatives-in-2024), [studytoolguide](https://studytoolguide.com/tool-comparisons/anki-flashcard-app-review)) | unverified | `/vs/anki` (planned, §6) |
| "quizlet alternative" | comparison / commercial | App Store subtitles ("Quizlet & Anki Alternative"); [RemNote "Replace: Notion, Quizlet, Anki"](https://www.remnote.com/anki); Knowt positioned as Quizlet's free alternative | unverified | `/vs/quizlet` (planned, §6) |
| "duolingo alternative" + "how much does &lt;competitor&gt; cost" | comparison + commercial investigation | dedicated 2026 cost pages exist and rank: [mindomax](https://www.mindomax.com/duolingo-cost) (2026-10-13), [onlinecourseing](https://onlinecourseing.com/duolingo-super-cost/) (2026-09-27), [bestlanguageapps](https://bestlanguageapps.com/guides/how-much-is-duolingo/) (2026-10-06) | unverified | `/vs/duolingo` (planned, §6) |
| "best flashcard app" / "best flashcard app with AI" | commercial | active 2026 roundups: [mindomax, 31 apps tested, 2026-09-08](https://www.mindomax.com/best-flashcard-apps), [mindomax, 10 best AI, 2026-03-01](https://www.mindomax.com/flashcard-app-with-ai-2026) | unverified | future comparison content (§6) |
| "spaced repetition app / flashcards" | commercial | App Store category saturated with SRS-branded apps (Space, Repetio, Flashcards Spaced Repetition, Azri FSRS) | unverified | landing + SEO baseline (Phase 3) |
| "vocabulary retention", "words won't stick", "&lt;exam&gt; vocabulary list", "spanish words I keep forgetting" | problem / ICP | ICP-driven rows from §3; no SERP roundups captured on 2026-10-21 → keep as speculative | unverified | future programmatic glossaries (§6) |

Rules for this table: a row may be promoted out of *speculative* only when a source URL + date is added; volumes stay `unverified` until someone with keyword-tool access fills them in. The `/vs/*` routes are planned in §6 and do not exist yet (verified 2026-10-21: `grep -c "vs/" src/App.tsx` → `0`).

---

## 5. Internationalization — the gate on everything above

No i18n system exists (`docs/audits/2026-10-20-app-state.md` §6). Search visibility in any language other than Spanish requires it.

### 5.1 Rollout order

| Order | Locale | Rationale |
|---|---|---|
| 1 | `es` (neutral, no regionalisms) | current base; must first be cleaned of "Preferís / Creá" and of English strings |
| 2 | `en` | largest market, unlocks the whole keyword surface, required before `hreflang` |
| 3 | `pt-BR` | large learning market, structurally close to `es` |
| 4 | `fr`, `de` | exam-driven demand (DELF, TestDaF/Goethe) |
| 5 | `ja` | JLPT demand; highest copy-adaptation cost, do last |

### 5.2 Work items

| # | Item | Notes |
|---|---|---|
| I-1 | Choose and install an i18n library | none present in `package.json` |
| I-2 | Extract all strings into `src/i18n/{es,en}.ts` | includes toasts, `error.message` mapping (closes U-11), navbar, `GuestBanner`, auth messages |
| I-3 | Remove Argentine Spanish; normalise to neutral ES | `docs/ONBOARDING-UX-DESIGN.md` micro-copy |
| I-4 | Locale detection + persistent switcher; dynamic `lang` on `<html>` | `src/index.html:2` |
| I-5 | Localized copy, not literal translation | taglines must be rewritten per market |
| I-6 | Localized prebuilt decks | `prebuiltDecks` are ES/EN only |
| I-7 | Localized legal pages | current text is GDPR/ES-oriented only |
| I-8 | Localized pricing display | EUR only today; needs a decision in `docs/BUSINESS_MODEL.md` (§44 boundary: this audit records it, it does not decide it) |
| I-9 | `hreflang` + per-locale sitemap | depends on I-1..I-4 and on the per-route meta solution in §4 |

### 5.3 Non-negotiable language rule

`AGENTS.md` §1 already requires neutral Spanish in agent communication and English in code, comments, commits and documentation. Product copy must follow the same split: **code English, user-facing text locale-driven**.

---

## 6. Organic channel plan (no budget)

| Channel | Action | Effort | Depends on |
|---|---|---|---|
| **On-page SEO** | description, OG, Twitter, canonical, favicon, `apple-touch-icon`, JSON-LD | small | none |
| **Technical SEO** | `robots.txt`, `sitemap.xml`, per-route titles, de-duplicate legal pages, `hreflang` | medium | §5 i18n |
| **Product-led SEO** | indexable pages per deck type / per exam / per language pair | large | i18n + content model |
| **Comparison content** | `/vs/anki`, `/vs/duolingo`, `/vs/quizlet` — honest, code-verified | medium | §2.3 accuracy |
| **Problem content** | "why I keep forgetting the words I learn", "active recall vs rereading" | medium | none |
| **Programmatic glossaries** | one indexable page per vocabulary list (exam word lists, profession vocabulary) | large | prebuilt deck pipeline |
| **PWA install** | manifest + icons + service worker → free install channel on iOS/Android web | small | `docs/issues/P2/2026-10-20-pwa-sin-configurar.md` |
| **Measurement** | Search Console, GA4, funnel `landing → signup → first deck → first game → payment` | medium | instrumentation currently errors-only |

### 6.1 Funnel that must be measured before any content work

1. Landing visit
2. `Empezar gratis` click (already `LandingPage.tsx` `onStart`)
3. Guest or Google sign-in
4. First deck created or imported
5. First game finished (`FinishedScreen`, `GameView.tsx:268`)
6. `EUR 4.99` checkout opened
7. Checkout completed

Today none of these seven events is recorded. Without them, content output cannot be judged.

---

## 7. Messaging corrections required before publishing anything

| Location | Current | Change |
|---|---|---|
| `src/components/views/LandingPage.tsx:236` | "Estadísticas avanzadas" | remove, or ship `featureFlags.reports` |
| `src/components/views/LandingPage.tsx:237` | "Exporta todos tus datos" | remove, or wire `/api/exportUserData` |
| `src/components/views/LandingPage.tsx:238` | "Soporte prioritario" | remove, or define the support channel |
| `docs/SERVICE_CATALOG.md` §7 | exam mode, SRS intervals, publish deck, 30-day recording cleanup | do not market until implemented |
| Premium sync claims | `docs/SERVICE_CATALOG.md` §7.3 | remove until `usePeriodicSync` is mounted |
| `README.md` | Gemini AI smart grouping, obsolete quotas | rewrite |
| `docs/LAUNCH_PLAN.md` | "remove Gemini" | Gemini is live for deck generation; rewrite |

`docs/BUSINESS_MODEL.md:115` already states the rule: *"Before any limit is set, marketing copy must match what is actually gated."* The same applies to every feature claim.

---

## 8. Sequenced roadmap

### Phase 0 — this audit (done)
`2026-10-20-app-state.md`, `2026-10-20-usability-gaps.md`, this document, plus new issues under `docs/issues/`.

### Phase 1 — usability first (per agreed priority)
U-02 guest decks · U-01 sync truth · U-19 copy corrections · U-09 Tailwind CDN · U-11/U-13 language consistency · U-10 quota visibility · U-12 `GameView` error state.

### Phase 2 — i18n base
I-1 → I-4 (library, extraction, neutral ES, `en`), then I-5.

### Phase 3 — SEO baseline
Meta, OG, JSON-LD, favicon, `robots.txt`, `sitemap.xml`, per-route titles, legal de-duplication.

### Phase 4 — organic content
Comparison pages, problem content, PWA install, Search Console + GA4 + funnel events.

### Phase 5 — locale expansion
`pt-BR`, `fr`, `de`, `ja` (I-6..I-9), each with localized decks, legal text and a pricing decision.

### Phase 6 — credibility
Real testimonials, honest feature parity (exam mode / SRS / export), rewrite of `LAUNCH_PLAN.md`, `LAUNCH_CHECKLIST.md`, `README.md`.

---

## 9. Success indicators

| Indicator | Today | First target |
|---|---|---|
| Meta description present | no | yes on `/` |
| `robots.txt` + `sitemap.xml` | no | yes |
| Languages in UI | 1 (mixed) | 2 (`es`, `en`), no mixed strings |
| Landing claims backed by code | 3 of 6 | 6 of 6 |
| Funnel events instrumented | 0 of 7 | 7 of 7 |
| Search Console property | unverified | verified with coverage data |
| PWA installable | no | yes |
| Open P1 issues | 8 (+1 filed) | 0 |

---

## 10. What this document does not decide

- Whether premium voice tiers and limits are correct → `docs/BUSINESS_MODEL.md` (§44 boundary).
- Whether to implement exam mode / SRS / export, or drop them from marketing → product decision, recorded as facts in `docs/SERVICE_CATALOG.md` §7.
- Pricing per currency or per market → `docs/BUSINESS_MODEL.md` only.

This audit records facts and options. Decisions belong to their authoritative documents.
