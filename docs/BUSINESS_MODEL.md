# Business Model

**Date:** 2026-10-11
**Status:** Founding document. This governs plan design, limits, pricing and
marketing copy. Decisions made here are not to be revisited case by case.
**Price:** Premium is a one-time €4.99 purchase (no subscription).
**Companion document:** [`SERVICE_CATALOG.md`](SERVICE_CATALOG.md) lists every
action a user can perform and what each one costs.

---

## 1. Rule 0

> **If nobody ever pays, the cost must be zero.**
>
> No free-tier capability may call a metered, third-party API. Everything that
> costs money per use is Premium-only. The free tier is composed exclusively of
> capabilities that run on the user's device or are not billed.

This is the constraint that decides every other question. When a design choice
trades free-tier capability against cost, Rule 0 wins.

### Consequence: cards are not a cost lever

Firestore storage costs cents. Limiting a free user to 1,000 cards versus 5,000
protects nothing financially. Card limits exist to shape perceived value, not to
control cost. Every limit that *does* control cost must sit on a metered API.

### Capacity fallback (decided)

If the free tier reaches a Firebase capacity limit — function invocations,
Firestore reads/writes, or hosting bandwidth — **stop accepting new free
users** and design the model then. This is explicitly deferred; do not
pre-optimise for it now.

Measured headroom for reference: the project has roughly 2M Cloud Function
invocations/month free, and the Vosk model is 41 MB downloaded once per user.

---

## 2. What the free tier actually contains

Verified to cost **$0 per user**:

| Capability | Where it runs |
|---|---|
| Cards, lists, study sessions, progress, history | App |
| Browser speech synthesis (`speechSynthesis`) | User device |
| Browser speech recognition (`webkitSpeechRecognition`) | User device |
| Vosk offline recognition (WASM) | User device |
| Local keyword extraction (TF-IDF) | User device |
| Local semantic grouping (ONNX embeddings, Web Worker) | User device |
| Manual text / CSV import (no AI) | App |

A free user already has the complete study loop, including voice. Nothing that
is billed is required to use the app.

---

## 3. What costs money

Every metered API in the backend, verified against the code:

| Service | Endpoint | Unit cost |
|---|---|---|
| Google Cloud TTS — Chirp 3 HD | `texttospeech.googleapis.com/v1/text:synthesize` | **$30 / 1M chars** (first 1M/mo free) |
| Google STT — Chirp 3 | `eu-speech.googleapis.com/.../recognizers/_:recognize` | **$0.016 / min** |
| Google STT — legacy v1 | `speech.googleapis.com/v1/speech:recognize` | **$0.016 / min** |
| Google Cloud Translation v3 | `translation.googleapis.com/.../translateText` | **$20 / 1M chars** (first 500k/mo free) |
| Gemini — AI deck generation | `@google/genai` SDK | **$0.30 / 1M input, $2.50 / 1M output** (free tier: $0) |

Not billed: YouTube oEmbed, the Google TTS voice list, and every on-device
capability above.

**DeepL was removed** (2026-10-11). It was the primary translation engine with
Google as fallback, but never produced a single translation in production
(`usage_stats` was empty). Google's free tier is the same size (500k chars/mo),
DeepL's free tier is closed to new signups, and maintaining two engines for the
same allowance is unjustified. **Google Translate v3 is the only translation
engine.**

---

## 4. The separation rule

| | Free ($0) | Premium |
|---|---|---|
| Cards, lists, study, progress | Unlimited | Unlimited |
| Voice (browser + Vosk offline) | ✓ | ✓ |
| Local grouping and extraction | ✓ | ✓ |
| **AI deck generation** | ✗ | Metered |
| **Chirp 3 HD voice** | ✗ | Metered |
| **Cloud transcription** | ✗ | Metered |
| **Translation** | ✗ | Metered |

Premium is *more of the same*, not secret functionality. Nothing that already
works for free becomes hidden; what costs money is rationed.

### Gaps that must close

The landing page currently promises things that are not actually gated, which
makes the paid tier dishonest:

| Promise | Reality |
|---|---|
| "Voces HD (Chirp 3)" | **Closed 2026-10-14** — hidden for free accounts, coerced to browser at runtime, and rejected server-side with `TIER_REQUIRED` (403) |
| "Estadísticas avanzadas" | Does not exist (`featureFlags.reports = false`) |
| "Exporta todos tus datos" | Not gated; no frontend call site |
| "Soporte prioritario" | Not implemented |

And one leak, **closed on 2026-10-14**: the audio-recording toggle in Settings
now requires Premium — the toggle is disabled for free accounts, the handler
guards stale clicks, and `useGameVoice` only records when the tier is premium.

**Before any limit is set, marketing copy must match what is actually gated.**

---

## 5. Deriving limits from the price

Premium is €4.99 once — roughly **$5.40**. The payback period is the business
decision; the limits follow from it mechanically.

```
monthly cost allowance per premium user = price / payback months
```

| Payback | Allowance / user / month |
|---|---|
| 12 months | $0.45 |
| 24 months | $0.22 |
| 36 months | $0.15 |

At $0.22/month that buys roughly: 7,000 chars of Chirp 3, 14 minutes of
transcription, 8,800 chars of translation.

**Current limits allow ~$29/user/month** — about 130× what the price supports.
They were set by intuition, never by this arithmetic. They must be replaced.

### The global ceiling matters more than per-user limits

Per-user limits bound individual cost. The global caps bound total spend, and
one of them is currently unreachable in practice:

| Global cap | Value | Cost ceiling |
|---|---|---|
| Translation | 400,000 chars/mo | ~$0 (inside the free 500k) |
| Chirp 3 TTS | 500,000 chars/mo | ~$15/mo total |
| Speech-to-text | 30,000 s/mo | ~$8/mo total |

Translation is free because it sits inside Google's allowance. TTS and STT are
the real fixed costs, and they scale with paying users, not with traffic.

---

## 6. Operating assumptions

**Production has zero real users.** Every test to date ran against the
Firebase emulator, where `usage_stats` is empty and the `users` collection is
absent.

This means:

- No quota has ever been exercised by real behaviour
- Every number in `config/plans.json` is a guess
- The right move is to **start conservative and raise limits with evidence**,
  not to tune up front and hope

The first 20-30 real users are the measurement instrument. Their actual usage
should set the limits, not the other way round.

**One open question that changes the arithmetic:** whether the Gemini API key is
on the free tier. Gemini 2.5 Flash is free of charge on the free tier, in which
case AI deck generation costs $0 and the largest cost line disappears.

---

## 7. Decisions taken

| Date | Decision |
|---|---|
| 2026-10-11 | Premium is a one-time €4.99 purchase, not a subscription |
| 2026-10-11 | Rule 0 adopted as the founding constraint |
| 2026-10-11 | Capacity overrun → stop onboarding free users; model deferred |
| 2026-10-11 | DeepL removed; Google Translate v3 is the only translation engine |
| 2026-10-11 | Premium = unlimited core + metered AI/voice; no hidden functionality |
| 2026-10-14 | Rule 0 enforced for voice: free tier blocked from Chirp 3 HD, cloud transcription and audio recording (`TIER_REQUIRED`, 403) |
| 2026-10-21 | FSRS / spaced-repetition intervals evaluated and **rejected**: cycles stay rule-based and the state of every word stays visible. Positioning consequence: the 4-cycle mechanism is the lead differentiator, and "spaced repetition" must never appear in copy |

## 8. Still open

- **Are we on the Gemini free tier?** Determines whether AI generation is free.
- **What is the payback period?** 12, 24 or 36 months. Sets every limit.
- **Does free get any AI deck generation at all?** Rule 0 says no paid API, so
  either premium-only, or a small allowance knowingly accepted as a cost.
- **How many free users are acceptable?** Needed before the capacity question
  can be answered quantitatively.
- **What is actually in Premium?** Beyond metered AI/voice, the current copy
  promises features that do not exist.