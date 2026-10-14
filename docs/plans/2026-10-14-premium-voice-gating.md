# Plan: Close the premium voice gating gaps

**Date:** 2026-10-14
**Status:** Implemented 2026-10-14 — phases 1–6 done, `tsc` clean and 836 tests
passing (evidence in §7). Version bump pending until deploy.
**Resolves:** [`../issues/done/2026-10-11-huecos-de-gating-premium.md`](../issues/done/2026-10-11-huecos-de-gating-premium.md)
**Authority:** [`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md) §1 (Rule 0) and §4. No new
business decision is made here; the plan only implements one that is already recorded.

---

## 1. Feature Map

| Feature | Root path | State | Metrics | Pending |
|---|---|---|---|---|
| Premium voice gating | `src/components/modals/settings/VoiceSection.tsx`, `src/components/views/SettingsView.tsx`, `backend/.../services/chirpTtsService/quota.js`, `backend/.../services/sttService/quota.js` | active — UI, runtime and server all gated | 2 UI leaks closed, 2 quota files, 1 TTS + 3 STT routes return 403, 5 client call sites coerced | none (version bump at deploy) |
| Voice engine (TTS/STT) | `src/hooks/voice/`, `backend/src/functions/src/routes/{ttsRoutes,sttRoutes}.js` | active | 3 TTS client call sites, 4 STT client call sites | none — cloud providers coerced when free |
| Recording (Firebase Storage) | `src/hooks/voice/useGameVoice.ts`, `src/services/audioService.ts` | active — SessionBar, Settings toggle and GameView all gated | toggle disabled for free, 2 runtime reads of the store flag | none |

**Goal:** a free account cannot reach Chirp 3 HD, cloud transcription, or the
audio-recording upload path — not from the UI, not from stale settings, and not
by calling the functions directly.

---

## 2. The gap (verified against the source)

### 2.1 UI leaks

| Leak | Evidence |
|---|---|
| Chirp 3 HD / Chiptt offered to everyone | `VoiceSection.tsx:120-147` — `ProviderToggle` options, props interface `:46-60` has no tier field; no `isPremium` in the file |
| Recording toggle open to free | `SettingsView.tsx:123-125` (handler), `:294-308` (toggle); `isPremium` already exists at `:39` but is only used by the Premium card |
| SessionBar gate is bypassed | `SessionBar.tsx:56` hides "Grabar Voz" for free, but `settings.audioRecordingEnabled` still reaches `useGameVoice` (`GameView.tsx:143`) and the banner (`GameView.tsx:347`) |

### 2.2 Server meters free instead of blocking

Rule 0 says a free account must never reach a billed API. Today the quota specs
grant free users a monthly allowance and reserve it:

| Meter | Free limit today | Code |
|---|---|---|
| Chirp 3 HD TTS | 5,000 chars/month | `chirpTtsService/quota.js:31-34` → `CHIRP_TTS_USER_LIMIT` (`constants.js:39`) |
| Cloud transcription | 3,000 s/month | `sttService/quota.js:31-34` → `CHIPTT_STT_USER_LIMIT` (`constants.js:45`) |

Routes that sit behind those meters:

- `ttsRoutes.js` → `synthesizeSpeech` → `chirpTtsService.synthesizeWithQuota`
- `sttRoutes.js` → `transcribeSpeech` (`:45`), `transcribeChirp3` (`:157`),
  `transcribeExistingAudio` (`:91`) — all call `sttService.transcribeWithQuota`

`chipttSttService/` also has a quota with the same free allowance, but it has
zero external callers (already parked in
[`../issues/P2/2026-10-11-codigo-muerto-y-endpoints-sin-uso.md`](../issues/P2/2026-10-11-codigo-muerto-y-endpoints-sin-uso.md)).

### 2.3 Rule 0 basis

`BUSINESS_MODEL.md` §4: free = ✗ for **Chirp 3 HD voice** and ✗ for **Cloud
transcription**; the audio-recording leak is named explicitly ("one leak: the
audio-recording toggle in Settings writes to Firebase Storage with no tier
check"). §1: "If nobody ever pays, the cost must be zero."

---

## 3. Design — four layers

```
Layer 1  server quota: free limit = 0 → 403 TIER_REQUIRED   (authoritative)
Layer 2  provider coercion at runtime: cloud → browser       (no wasted calls)
Layer 3  settings UI: hide options, disable toggle           (obvious to the user)
Layer 4  recording runtime: flag AND isPremium               (stale settings)
```

Why limit 0 in the quota spec instead of a separate tier check in each route:
`meteredQuota.js:24-25` already reads `tierRef` inside the same transaction, so
`userTtsLimit`/`userSttLimit` returning `0` for free blocks the request **before
the paid API is called**, with no extra Firestore read and no second code path.
The counters' `limit` is already a function of `tierData`
(`chirpTtsService/quota.js:84`, `sttService/quota.js:~104`), so the change is
two functions plus an `onExceed` branch.

Graceful degradation already exists: `useSpeechSynthesis.ts:159-172` falls back
to the browser engine whenever chirp returns `ok: false`, so a stale
`chirp` provider on a free account produces browser audio, not a broken session.

**Known limitation:** `storage.rules` cannot see the account tier (no custom
claims), so a hand-crafted Storage upload by a free user is not blocked by rules.
Residual risk is cents-level and out of scope for this plan.

---

## 4. Phases

### Phase 1 — Backend enforcement (the real gate)

- [x] `backend/src/functions/src/services/chirpTtsService/quota.js`
  - `userTtsLimit` (`:31-34`): free → `0`.
  - user counter `onExceed` (`:86-93`): if resolved `limit === 0`, return
    `quotaError(<Premium message>, 'TIER_REQUIRED', used, limit)` instead of the
    monthly-quota message.
- [x] `backend/src/functions/src/services/sttService/quota.js`
  - `userSttLimit` (`:31-34`): free → `0`.
  - user counter `onExceed` (`:~104`): same `TIER_REQUIRED` branch.
- [x] `backend/src/functions/src/routes/ttsRoutes.js` catch block (`:74-78`):
  map `TIER_REQUIRED` → `403 { error, code }`.
- [x] `backend/src/functions/src/routes/sttRoutes.js`: same mapping in the three
  catches — `transcribeSpeech` (`:47`), `transcribeExistingAudio` (`:~95`),
  `transcribeChirp3` (`:162`).
- Do **not** touch `chipttSttService` (dead service, existing P2).

### Phase 2 — Client provider coercion (stale settings)

A free account can still hold `ttsProvider: 'chirp'` or `sttProvider: 'chiptt'`
in a list (saved before this fix, or as a guest). Coerce at resolution time so
no request is even sent:

- [x] New helper `src/services/voice/effectiveProviders.ts` (camelCase util):
  `resolveEffectiveVoiceProviders(settings, tier)` → `{ ttsProvider, sttProvider }`
  with `chirp`→`browser`, `chiptt`→`browser` when `tier !== 'premium'`.
- [x] Call sites (all verified):
  - `src/hooks/voice/useGameVoice.ts:143` (tts) and `:145` (stt)
  - `src/hooks/voice/useVoiceSTT.ts:25` (tts) and `:32` (stt)
  - `src/components/views/GameView.tsx:154` (tts, `handleSpeakAnswer`)
  - Tier source: `useGameStore((s) => s.quota?.tier)` (guests → `null` → free,
    consistent with AGENTS §31).

### Phase 3 — Settings UI gating

- [x] `VoiceSection.tsx`: add `isPremium: boolean` to `VoiceSectionProps`
  (`:46-60`); filter the TTS options (`:123-126`) and STT options (`:142-146`)
  so `chirp`/`chiptt` are not rendered for free. `browser` and `vosk` always stay.
- [x] `SettingsModal.tsx`: read the tier from the store, pass `isPremium` to
  `VoiceSection` (`:233`), and extend `normalizeVoiceSettings` (`:26`) with the
  tier so a stored `chirp`/`chiptt` draft is coerced to `browser` — used both at
  draft init (`:46-48`) and in `handleAccept` (`:85`).
- [x] `SettingsView.tsx` recording block (`:276-310`):
  - `disabled` + `aria-disabled` + reduced opacity when `!isPremium`.
  - Copy pointing at the upgrade (message beside the toggle).
  - Guard `handleToggleAudioRecording` (`:123`) so a stale click does nothing.
- [x] `src/constants/premium.ts`: add
  `PREMIUM_TOAST_RECORDING_REQUIRED` (Spanish user-facing copy, English comment,
  following the existing `PREMIUM_TOAST_*` pattern).

### Phase 4 — Recording runtime defense

- [x] `GameView.tsx`: move the `quota` / `isPremium` selectors (`:150-151`) above
  the `useGameVoice` call (the argument at `:143` cannot reference them before
  declaration). Selector order stays fixed across renders.
- [x] `GameView.tsx:143`: `audioRecordingEnabled: settings.audioRecordingEnabled && isPremium`.
- [x] `GameView.tsx:347`: banner condition also requires `isPremium`.
- The parent owns the game flow per AGENTS §29; `useGameVoice` keeps receiving a
  plain boolean.

### Phase 5 — Tests

- [x] Update `tests/components/SettingsView.test.tsx`: recording toggle disabled
  with the upgrade message under `FREE_QUOTA`, enabled under `PREMIUM_QUOTA`
  (fixtures already exist at `:21-37`).
- [x] New `tests/components/modals/settings/VoiceSection.test.tsx`:
  `chirp`/`chiptt` absent when `isPremium={false}`, present when `true`;
  `browser`/`vosk` always rendered.
- [x] SettingsModal coercion: free draft with `ttsProvider: 'chirp'` normalizes
  to `'browser'` (assert through `normalizeVoiceSettings` behavior).
- [x] Backend meter behavior: assert in `tests/services/meteredQuota.test.ts`
  (root vitest runner; `backend/src/functions/package.json` has no `test` script)
  — `buildTtsQuotaSpec(...).counters[1].limit({ tier: 'free' }) === 0` and its
  `onExceed(0, 0).code === 'TIER_REQUIRED'`; same for the STT spec. No Firestore
  needed (specs are plain objects).
- [x] Commands (full output pasted per AGENTS §34):
  - `npx tsc --noEmit`
  - `npx vitest run tests/components/SettingsView.test.tsx tests/components/modals`
  - backend tests runner (confirm the exact command in
    `backend/src/functions/package.json` before running)

### Phase 6 — Docs and closure

- [x] Move `docs/issues/P1/2026-10-11-huecos-de-gating-premium.md` →
  `docs/issues/done/` with the resolution summary; update the counts and tables
  in `docs/issues/README.md` (AGENTS §44).
- [x] `docs/dashboard-api-trigger-analysis.md`: changelog entry — `GameView.tsx`
  is a documented trigger file (AGENTS §33).
- [x] `docs/BUSINESS_MODEL.md` §4: refresh the "Gaps that must close" reality
  column (Chirp row) and the "one leak" paragraph — both closed by this plan.
- [x] Verify with grep whether `docs/SERVICE_CATALOG.md` still documents a free
  Chirp/STT allowance; update if it does.
- [ ] Version bump (minor) via the `version-bump` skill at deploy time only.

---

## 5. Out of scope

| Item | Where it already lives |
|---|---|
| `voiceSttFallback` toggle is written but never read (dead toggle) | parked: `docs/issues/P2/2026-10-14-voice-stt-fallback-dead-toggle.md` |
| `chipttSttService/` dead service (its free allowance is unreachable) | existing P2 `codigo-muerto-y-endpoints-sin-uso` |
| `transcribeExistingAudio` always 502 | existing P1 `transcribe-existing-audio-roto` |
| Recordings stored base64 in Firestore, deletion gaps | existing P1 `audio-base64-en-firestore` |
| Storage rules cannot express tier | known limitation, §3 of this plan |
| Existing free-tier files in Storage | removed on account deletion (`userRoutes.js:394-399`); no separate cleanup |
| Landing copy rows for reports/export/support | business/marketing, `BUSINESS_MODEL.md` §4 |

---

## 6. Verification checklist (AGENTS §39)

```
1. npx tsc --noEmit                       -> empty
2. npx vitest run <touched tests>         -> all pass, output pasted
3. ls docs/plans/2026-10-14-premium-voice-gating.md + new P2 issue
4. grep -r "TIER_REQUIRED\|isPremium"     -> all call sites updated
5. git diff                               -> no stray code, no `any`, no @ts-ignore
6. docs/issues/README.md counts updated
```

---

## 7. Verification evidence (2026-10-14)

### TSC

```
$ npx tsc --noEmit
TSC EXIT: 0   (empty output)
```

### Tests

```
$ npx vitest run
 Test Files  68 passed (68)
      Tests  836 passed (836)
   Duration  16.30s
VITEST EXIT: 0
```

Includes the new/updated suites:

| Suite | Result |
|---|---|
| `tests/services/meteredQuota.test.ts` | 24 passed — free rejected with `TIER_REQUIRED` before any API call, premium ceilings 100000 / 72000 intact |
| `src/services/voice/effectiveProviders.test.ts` | 10 passed — chirp/chiptt → browser for free/null tier, vosk and browser untouched |
| `tests/components/SettingsView.test.tsx` | 20 passed — recording toggle disabled for free, guard on stale click, works for premium |
| `tests/components/modals/settings/VoiceSection.test.tsx` | 3 passed — chirp/chiptt hidden for free, on-device providers always shown |
| `tests/components/modals/settings/settingsModalNormalize.test.ts` | 6 passed — stored cloud providers coerced to browser for free/null tier, chirp ids cleaned |

### Files verified

```
$ ls src/services/voice/effectiveProviders.ts src/constants/premium.ts \
      tests/components/modals/settings/
src/constants/premium.ts
src/services/voice/effectiveProviders.ts

tests/components/modals/settings/:
VoiceSection.test.tsx
settingsModalNormalize.test.ts

$ git status --short
 M backend/src/functions/src/routes/sttRoutes.js
 M backend/src/functions/src/routes/ttsRoutes.js
 M backend/src/functions/src/services/chirpTtsService/quota.js
 M backend/src/functions/src/services/sttService/quota.js
 M docs/BUSINESS_MODEL.md
 M docs/dashboard-api-trigger-analysis.md
 M docs/issues/README.md
RM docs/issues/P1/2026-10-11-huecos-de-gating-premium.md -> docs/issues/done/2026-10-11-huecos-de-gating-premium.md
 M src/components/modals/SettingsModal.tsx
 M src/components/modals/settings/VoiceSection.tsx
 M src/components/views/GameView.tsx
 M src/components/views/SettingsView.tsx
 M src/constants/premium.ts
 M src/hooks/voice/useGameVoice.ts
 M src/hooks/voice/useVoiceSTT.ts
 M tests/components/SettingsView.test.tsx
 M tests/services/meteredQuota.test.ts
?? docs/issues/P2/2026-10-14-voice-stt-fallback-dead-toggle.md
?? docs/plans/2026-10-14-premium-voice-gating.md
?? src/services/voice/effectiveProviders.test.ts
?? src/services/voice/effectiveProviders.ts
?? tests/components/modals/settings/
```

### Remaining

- Version bump (minor) at deploy time — the only unchecked box.
