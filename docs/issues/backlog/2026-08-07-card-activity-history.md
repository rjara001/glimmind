# Card Activity History (Histórico de actividad de tarjetas)

Status: Approved
Date: 2026-08-07
Scope: Multi-session

## Objective

Register and visualize the activity history of each card:

- **Movements**: split/organize (`splitList`, SmartGroup) -> `card_moved` event per card.
- **Updates**: changes to `term` (value1) or `definition` (value2) -> `card_updated` with before/after.
- **Game**: per-card correct-answer counter and progression `nueva -> vista -> reconocida -> conocida -> aprendida`.

The history registration is **NOT for everyone**: it is an option in a new global Settings page, **disabled by default**.

Three views (only visible when the option is enabled):

1. **Activity** (paginated feed).
2. **Game summary** (sessions).
3. **Ranking** (most played + fewest correct answers).

## Confirmed decisions

| Topic | Decision |
|---|---|
| Settings | New **SettingsView** page (general environment configuration); first option "Registro de historial", **off by default** |
| Toggle scope | Controls **everything**: events, `hits/misses/timesPlayed` counters, session summaries. Off -> the 3 views show an empty state with a link to Settings |
| Movement | Split/organize registers `card_moved`; no new move feature |
| History persistence | Subcollection `users/{uid}/activity` (cloud) + `localStorage` (guest) |
| Settings persistence | Doc `users/{uid}/settings/main` (cloud) + `localStorage` (guest) |
| Volume | Unlimited, cursor-paginated feed; ranking from per-card counters |
| Counters | `hits/misses/timesPlayed` on `Association`, persisted with the list |

## 1. Data model

### `types/settings.ts` (new)

```ts
export interface UserSettings {
  activityHistoryEnabled: boolean;  // default false
  updatedAt?: number;
}
export const DEFAULT_SETTINGS: UserSettings = { activityHistoryEnabled: false };
```

### `Association` (types.ts) - new fields

`hits`, `misses`, `timesPlayed`, `lastPlayedAt?`, `createdAt?`, `updatedAt?`.

### `types/activity.ts` (new)

`CardLevel`, `CardActivityType` (`card_created/updated/archived/restored/deleted/moved/revealed/answered/level_up`), `CardActivityEvent` (with `sessionId`, before/after, fromListId/toListId, correct, fromLevel/toLevel), `GameSessionSummary`.

## 2. Backend (`functions/index.js`)

- `getSettings` / `updateSettings`: read/write `users/{uid}/settings/main`. Auth via `requireAuth`. Default `activityHistoryEnabled: false` on creation.
- `appendActivity`: batch events -> `users/{uid}/activity` (chunks <= 400, below the batched-write limit).
- `getActivity`: `orderBy('at','desc')` + cursor, filters by `listId`/`type` -> `{ events, nextCursor }`.
- `saveSession`: upsert `users/{uid}/sessions`.
- `firestore.rules`: rules for `users/{userId}/activity`, `/sessions`, `/settings` (in prod restricted to `request.auth.uid == userId`).

## 3. Frontend services

- `services/settingsService.ts`: `fetchSettings`, `saveSettings` (cloud) + `loadLocalSettings/saveLocalSettings` (guest, key `glimmind_settings`).
- `services/activityService.ts`: `appendEvents`, `fetchActivity` (cloud) + local helpers (key `glimmind_activity`).
- `utils/activity.ts`: event builders, level mapping (reuse `stateOf` from `utils/progress.ts`), `backfillAssociationStats`.
- `utils/ranking.ts` (pure functions): `rankByPlays`, `rankByWeakness` (ratio hits/(hits+misses), exclude never-played), `summarizeSessions`.

## 4. Game engine (`gameEngine.ts`)

- Increment `timesPlayed` (on presentation), `hits` (correct), `misses` (incorrect), set `lastPlayedAt`.
- The increment runs only when tracking is enabled (see section 6 for the gate).
- Extend `gameEngine.test.ts`.

## 5. Store (`gameStore.ts`)

- New state: `settings: UserSettings`, `activity: CardActivityEvent[]`, `activityNextCursor`, `activityLoading`.
- New actions: `loadSettings`, `setSettings` (persist + cloud), `recordActivity(events)` (only if `activityHistoryEnabled`), `loadActivity({ cursor })`.
- `loadInitialData`: load settings; apply `backfillAssociationStats` (idempotent zero-fill, relevant once history is enabled).
- **Central gate**: event emission and counter updates are cut off in `useGameLogic`/`App` when `settings.activityHistoryEnabled === false`; `updateAssociations` during gameplay must NOT generate `card_updated` (the diff only compares `term`/`definition`).

## 6. Activation gate

- `useGameLogic` reads `settings.activityHistoryEnabled`. When off:
  - no events, no session persistence, no counter increments (cards keep `hits/misses/plays` untouched).
  - the game behaves exactly as today (current flow intact).
- When on: emits `card_answered/revealed/level_up` with `sessionId` and persists the session summary when reaching `summary`.

## 7. Event emission (only when on)

| Action | Origin | Event |
|---|---|---|
| Correct/incorrect/reveal | `useGameLogic` | `card_answered`, `card_revealed`, `card_level_up` (+ counters) |
| Update term/definition | `ListEditor`/`handleUpdateList` | `card_updated` (before/after) |
| Split/organize | `handleCreateMultipleLists` | `card_moved` (fromListId -> toListId) |
| Create | `handleQuickAdd`/`createList`/bulk | `card_created` |
| Archive/restore/delete | `ListEditor`/`FinishedScreen` | `card_archived/restored/deleted` |
| End of session | `gameView === 'summary'` | `saveSession` |

## 8. UI

- **`components/SettingsView.tsx` (new) - general environment configuration**: "Registro de historial" toggle (off by default) with description and, when enabled, a notice that it applies from now on. Designed to host future global options.
- `App.tsx`: `view` becomes `'dashboard' | 'game' | 'editor' | 'activity' | 'reports' | 'settings'`; gear icon in header -> Settings.
- **`HistoryView`**: timeline feed grouped by date, filters by type/list/card, "Load more" (cursor). If history off -> empty state with link to Settings.
- **`GameSummaryView`**: sessions from `users/{uid}/sessions` (date, list, played, correct/incorrect, level advances). Off -> empty state.
- **`RankingView`**: tabs "Most played" / "Fewest correct", computed client-side with `utils/ranking.ts`. Off -> empty state.
- UI language Spanish, consistent with the app (code/comments in English per AGENTS.md).

## 9. Migration

- Existing cards: backfill counters to 0 (idempotent); past history is not reconstructed.
- New users: `settings.main` with `activityHistoryEnabled: false` by default.
- Version bump in `constants/version.ts` (requirement from `glimmind-engine.md`).

## 10. Tests (vitest)

- `utils/settings.test.ts`, `utils/activity.test.ts`, `utils/ranking.test.ts`.
- `gameEngine.test.ts` (counters + level transition, including tracking-off case).
- `SettingsView.test.tsx` (toggle persists, default off), `HistoryView.test.tsx`, `RankingView.test.tsx` (render + on/off empty states).
- Store: settings load/save, `recordActivity` gate.

## 11. Milestones (multi-session)

- **A - Foundations**: `types/settings.ts` + `types/activity.ts`, fields on `Association`, `utils/activity` + `utils/ranking`, engine counters + tests, backfill.
- **B - Settings + persistence**: `settingsService`, `getSettings/updateSettings` endpoints + rules, store (settings), `SettingsView`, on/off gate.
- **C - History**: `activityService`, `appendActivity/getActivity/saveSession` endpoints + rules, store (activity), `useGameLogic` (events + `sessionId` + session).
- **D - UI**: `HistoryView`, `GameSummaryView`, `RankingView`, navigation, event wiring (App/ListEditor/FinishedScreen), empty states.
- **E - Close-out**: coverage, version bump, `npm test` + `npm run build`, QA (guest + account, on/off).

## Risks / notes

- Default **off**: no behavior change for existing users until they enable the option.
- False `card_updated` during gameplay -> text-only diffs + central gate.
- Batched writes (500) -> chunks <= 400.
- Guest `localStorage` (~5MB) -> in-memory paginated feed; acceptable.
- `cardTerm` snapshot in events may become stale (intentional).
