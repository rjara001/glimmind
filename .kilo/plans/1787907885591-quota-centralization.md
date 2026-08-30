  # Plan: Centralized Quota System Refactor

  ## Goal
  Replace scattered hardcoded quota values with a single source of truth, add 3-tier alert levels (warning/danger/blocked), and decouple quota logic into a reusable service. Frontend shows progressive alerts; backend enforces hard limits.

  ## Current State Audit

  ### Backend (`backend/src/functions/src/`)
  - `utils/constants.js`: `DEFAULT_CARD_QUOTA=5000`, `PREMIUM_CARD_QUOTA=5000`, `DEFAULT_AI_DAILY_QUOTA=3`, `PREMIUM_AI_DAILY_QUOTA=10`, `YT_AI_DAILY_LIMIT_FREE=100`, `YT_AI_DAILY_LIMIT_PREMIUM=200`
  - `services/listService/crud.js`: Hard blocks at `DEFAULT_CARD_QUOTA` (5000) for free users
  - `services/listService/quota.js`: Uses `DEFAULT_CARD_QUOTA` and `MAX_CARDS_PER_LIST` (5000)
  - `services/userService.js`: Sets `cardQuota` and `aiQuotaDaily` on premium upgrade using same constants
  - `routes/youtubeDeckRoutes.js` + `routes/createDeckFromText.js`: Check YT AI daily quota (`ytAiUsedToday` vs `ytAiDailyLimit`)
  - `utils/helpers.js`: `metaDefaults()` uses `DEFAULT_CARD_QUOTA` and `DEFAULT_AI_DAILY_QUOTA`

  ### Frontend (`src/`)
  - `constants/limits.ts`: `DEFAULT_CARD_QUOTA=5000`, `PREMIUM_CARD_QUOTA=5000`, `QUOTA_WARNING_THRESHOLD=0.9`
  - `types/quota.ts`: `QuotaState = 'ok' | 'warning' | 'blocked'` (only 2 states)
  - `utils/quota.ts`: `computeQuotaStatus()` uses single threshold (0.9)
  - `hooks/app/useAppActions.ts`: Blocks `createListCore` at `blocked`
  - `components/ListEditor.tsx`: Blocks save at `blocked` with `alert()`
  - `components/views/Dashboard.tsx`: Shows quota status in stats
  - `services/quotaService.ts`: Only fetches quota from backend, no logic

  ## Key Problems
  1. **Duplicate constants**: Same values hardcoded in backend and frontend
  2. **2-state model**: Only `ok` / `blocked` — no progressive warning
  3. **Wrong blocking behavior**: Frontend blocks manual list creation at 100%, but user wants manual creation to be permisive (only backend should hard-block)
  4. **AI vs Manual not distinguished**: Same `cardQuota` check controls both flows
  5. **Premium = Free for cards**: Both tiers have 5000 card quota, but user wants 1000 free / 5000 premium

  ## Target Behavior

  ### Thresholds
  | Level | Ratio | Card Quota (Free) | Card Quota (Premium) | AI Quota |
  |-------|-------|-------------------|----------------------|----------|
  | ok | < 80% | 0–799 | 0–3999 | Any |
  | warning | 80–94% | 800–999 | 4000–4999 | Near limit |
  | danger | 95–99% | 1000–999 | 5000–4999 | Blocked |
  | blocked | >= 100% | 1000+ | 5000+ | Blocked |

  Wait — the user said: "definimos una cuota de creo 1000 cartas por usuario para la capa libre, y 5000 para premium". But also said "no quiero mandarle un mensaje de ese estilo que rompe la UX" for manual creation, and "alerta amarilla en 80%, roja en 95%, límite en 100%".

  Actually re-reading: "ciertamente definimos una cuota de creo 1000 cartas por usuario para la capa libre, y 5000 para premium, pero no quiero mandarle un mensaje de ese estilo que rompa la UX."

  So the actual quotas ARE 1000 free / 5000 premium. The alerts are:
  - Yellow at 80% (800 for free, 4000 for premium)
  - Red at 95% (950 for free, 4750 for premium)  
  - Block at 100% (1000 for free, 5000 for premium)

  And the behavior:
  - Manual creation: permisivo en warning y danger, solo backend bloquea en blocked (100%)
  - AI features: bloqueo duro en danger (95%) y blocked (100%)

  Wait, the user said earlier about Text Importer: "Los limites estan asociados a uso de recursos de gemmini, y otros que no recuerdo ahora, pero el debiese poder crear tantos mazos como quisese, o no?"

  So manual list creation should be permisive. But what about card count? If a user has 950 cards (free), they can still add more manually until 1000. At 1000, backend blocks. The frontend shows yellow at 800, red at 950.

  But what if they try to use AI at 950? That should be blocked.

  Let me clarify the behavior matrix:

  | Action | ok (<80%) | warning (80-94%) | danger (95-99%) | blocked (>=100%) |
  |--------|-----------|------------------|-----------------|-------------------|
  | Manual list create | Allowed | Allowed + yellow banner | Allowed + red banner | Backend blocks, frontend shows blocked |
  | Manual add cards in editor | Allowed | Allowed + yellow banner | Allowed + red banner | Backend blocks, frontend shows blocked |
  | AI (YouTube/Text/Gemini) | Allowed | Allowed | BLOCKED | BLOCKED |

  So for AI, the threshold is danger (95%), not blocked (100%). For manual, only backend blocks at 100%.

  Actually, re-reading the user's message again: "Comportamiento de Bloqueo: Funciones de IA (YouTube, Gemini, Text Import): Bloqueo duro a partir de 'danger'/'blocked' (>= 95% / 100%). Edición/Creación Manual (Frontend): Permisivo en 'warning' y 'danger' con aviso visual. El bloqueo duro solo se ejecuta en Backend al alcanzar el 100%."

  So AI is blocked at danger (95%) AND blocked (100%). Manual is permisive at warning and danger, backend blocks at 100%.

  Now, about the config values: user said "1000 cartas por usuario para la capa libre, y 5000 para premium". But the current backend has 5000 for both. So we need to change free to 1000.

  Wait, the user said "ciertamente definimos una cuota de creo 1000 cartas por usuario para la capa libre, y 5000 para premium". This might mean they already defined this somewhere but the code doesn't reflect it. Or they want to define it now. The plan should set these as the canonical values.

  Also, what about `MAX_CARDS_PER_LIST`? Currently 5000 in backend. This is a per-list limit, not a user quota. Should it stay 5000? The user didn't mention changing it. Let's keep it as a separate limit.

  Now, about the QuotaService design. The user wants:
  1. `src/constants/quotaConfig.ts` - centralized config
  2. `src/services/quotaService.ts` - agnostic service with `getStatus()`, `canAddCards()`, `canUseAI()`
  3. Backend equivalent

  The service should be pure TypeScript, no React/JSX dependencies.

  Let me also think about the backend. The backend is Node.js, not TypeScript. So the "equivalent" would be a JS file or keeping constants in `constants.js` and creating a `quotaService.js` that mirrors the frontend logic.

  Actually, looking at the backend code, it's all CommonJS (`require`, `module.exports`). We should keep it consistent.

  ## Implementation Plan

  ### Step 1: Create Centralized Config

  **Frontend: `src/constants/quotaConfig.ts`**
  ```ts
  export const QUOTA_CONFIG = {
    tiers: {
      free: {
        maxCards: 1000,
        aiMonthlyLimit: 100,
      },
      premium: {
        maxCards: 5000,
        aiMonthlyLimit: 1000,
      }
    },
    thresholds: {
      warningRatio: 0.80, // 80% (Amarillo)
      dangerRatio: 0.95,  // 95% (Rojo)
      blockRatio: 1.00    // 100% (Bloqueo)
    }
  };

  export type TierType = 'free' | 'premium';
  export type QuotaLevel = 'ok' | 'warning' | 'danger' | 'blocked';

  export interface QuotaStatus {
    currentCards: number;
    maxCards: number;
    usageRatio: number;
    percentage: number;
    level: QuotaLevel;
    isAiBlocked: boolean;      // >= dangerRatio (0.95)
    isManualBlocked: boolean;  // >= blockRatio (1.0)
  }
  ```

  **Backend: `backend/src/functions/src/utils/quotaConfig.js`**
  Mirror the same structure in CommonJS.

  ### Step 2: Create QuotaService

  **Frontend: `src/services/quotaService.ts`**
  - Pure class, no React dependencies
  - `static getMaxCards(tier)`
  - `static getStatus(currentCards, tier)` → QuotaStatus
  - `static canAddCards(currentCards, cardsToAdd, tier)` → boolean
  - `static canUseAI(currentCards, tier)` → boolean (blocks at danger)
  - `static getAiMonthlyLimit(tier)` → number

  **Backend: `backend/src/functions/src/services/quotaService.js`**
  - Same logic, CommonJS
  - Used by `listService/crud.js`, `listService/quota.js`, AI routes

  ### Step 3: Refactor Backend

  **Files to modify:**
  1. `backend/src/functions/src/utils/constants.js` — Remove `DEFAULT_CARD_QUOTA`, `PREMIUM_CARD_QUOTA`, `DEFAULT_AI_DAILY_QUOTA`, `PREMIUM_AI_DAILY_QUOTA`, `YT_AI_DAILY_LIMIT_FREE`, `YT_AI_DAILY_LIMIT_PREMIUM` (move to quotaConfig)
  2. `backend/src/functions/src/utils/quotaConfig.js` — New file with centralized config
  3. `backend/src/functions/src/utils/helpers.js` — Import from quotaConfig instead of constants
  4. `backend/src/functions/src/services/listService/quota.js` — Use quotaService
  5. `backend/src/functions/src/services/listService/crud.js` — Use quotaService, change block logic to use `isManualBlocked`
  6. `backend/src/functions/src/services/userService.js` — Use quotaConfig
  7. `backend/src/functions/src/routes/youtubeDeckRoutes.js` — Use quotaService.canUseAI() instead of inline checks
  8. `backend/src/functions/src/routes/createDeckFromText.js` — Same as above
  9. `backend/src/functions/src/services/aiService/quota.js` — Already uses constants, migrate

  ### Step 4: Refactor Frontend

  **Files to modify:**
  1. `src/constants/limits.ts` — Remove `DEFAULT_CARD_QUOTA`, `PREMIUM_CARD_QUOTA`, `QUOTA_WARNING_THRESHOLD` (move to quotaConfig)
  2. `src/constants/quotaConfig.ts` — New centralized config
  3. `src/types/quota.ts` — Update `QuotaState` to 4 levels, update `QuotaStatus` interface
  4. `src/services/quotaService.ts` — Replace with new class-based service
  5. `src/utils/quota.ts` — Deprecate `computeQuotaStatus` (or make it delegate to QuotaService)
  6. `src/hooks/app/useAppActions.ts` — Use QuotaService, remove hard blocks for manual creation (only warn), keep AI blocks
  7. `src/components/ListEditor.tsx` — Use QuotaService, show warning/danger banners instead of alert()
  8. `src/components/views/Dashboard.tsx` — Use QuotaService for status display
  9. `src/components/views/TextImporter.tsx` — Use QuotaService.canUseAI() before submit
  10. `src/components/modals/CreateYouTubeDeckModal.tsx` — Use QuotaService.canUseAI() before submit

  ### Step 5: UI/UX Changes

  **New alert components/banners:**
  - Warning banner (yellow): "Estás acercándote al límite de tarjetas (X/Y)"
  - Danger banner (red): "Te quedan pocas tarjetas disponibles (X/Y)"
  - Blocked banner (red + icon): "Llegaste al límite de tarjetas"

  **Where to show:**
  - Dashboard: top banner when `level !== 'ok'`
  - ListEditor: top banner when `level !== 'ok'`
  - TextImporter: top banner when `level !== 'ok'`
  - CreateYouTubeDeckModal: block at danger with error message

  ### Step 6: Migration Path

  1. Add new config/service files
  2. Update backend one file at a time, keeping old constants exported temporarily
  3. Update frontend one file at a time
  4. Remove old hardcoded values after all references are migrated
  5. Update `metaDefaults()` to use new defaults

  ## Risks
  1. **Breaking existing users**: If we change `DEFAULT_CARD_QUOTA` from 5000 to 1000, existing free users with >1000 cards will suddenly be "blocked". Need migration strategy: either keep existing users at their current count as new baseline, or only apply to new users.
  2. **Backend/frontend drift**: If configs diverge, behavior mismatches. Solution: keep them in sync via docs/CI check.
  3. **Performance**: `computeQuotaStatus` is called frequently; service must be lightweight.

  ## Migration Strategy for Existing Users
  For users who already have >1000 cards (the old free limit was effectively 5000), we should NOT retroactively block them. Options:
  - A. On first load after deploy, set their `cardQuota` to `max(currentCount, 1000)` so they keep their existing cards
  - B. Keep `DEFAULT_CARD_QUOTA=5000` for existing meta docs, only apply 1000 to new users
  - C. Grandfather period: allow 5000 for users created before date X

  Recommended: **Option A** — on `getOrCreateMeta` or `getQuota`, if tier is free and `cardCount > 1000`, set `cardQuota = cardCount` (or max of 1000 and cardCount) so they aren't immediately blocked.

  ## Validation Plan
  - Unit tests for `QuotaService.getStatus()`, `.canAddCards()`, `.canUseAI()`
  - Verify backend block at 100% for manual, 95% for AI
  - Verify frontend shows correct banners at each threshold
  - Verify existing users with >1000 cards are not blocked after deploy
  - Verify premium users see 5000 limit

  ## Open Questions
  1. Should we grandfather existing users? (Recommended: yes, see migration strategy)
  2. Should `MAX_CARDS_PER_LIST` stay at 5000 for both tiers? (Yes, it's a per-list technical limit, not a quota)
  3. Should the backend `QuotaExceededError` message include the tier-specific limit? (Yes)
  4. Do we need a separate `aiMonthlyLimit` or keep daily? The user mentioned monthly in quotaConfig but current system is daily. Need to decide.

  Wait, the user's quotaConfig says `aiMonthlyLimit` but the backend uses daily limits (`ytAiDailyLimit`). This is a mismatch. The current system tracks AI usage daily (ytAiUsedToday, aiUsedToday), not monthly. Should we:
  - Keep daily (consistent with current system)
  - Change to monthly (bigger refactor, changes tracking logic)

  I think we should keep daily for now to minimize blast radius, but the config key should reflect reality. Or we can add both.

  Actually, looking at the user's example: `aiMonthlyLimit: 100`. But the backend has `YT_AI_DAILY_LIMIT_FREE = 100`. These are the same numbers! So maybe the user meant daily but said monthly. Or maybe they want monthly.

  I'll note this as an open question.

  ## Next Steps
  1. Confirm the open questions above
  2. Create plan file
  3. Implement
