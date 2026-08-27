# Plan: Admin Usage Dashboard — All Paid Services

**Date:** 2026-08-26
**Status:** Draft

---

## Objective

Create an admin-only view that shows usage/consumption for all paid services (Translation, TTS, STT, AI) per user and globally. The admin sees a unified dashboard with character/second/call counts, limits, and per-user breakdowns.

---

## Current State

### Paid Services & Limits

| Service | Unit | Free Limit | Premium Limit | Global Cap | Period |
|---------|------|------------|---------------|------------|--------|
| Translation | chars | 20,000 | 100,000 | 400,000 | Monthly |
| TTS (Chirp) | chars | 5,000 | 100,000 | 500,000 | Monthly |
| STT | seconds | 3,000 | 72,000 | 30,000 | Monthly |
| AI (Gemini) | calls | 3 | 10 | 200 | Daily |
| Cards | count | 5,000 | 5,000 | N/A | Total |

### Firestore Storage Paths

```
Translation:
  users/{uid}/usage/translation_{YYYY-MM}    → { charactersTranslated, lastTranslationAt }
  usage_stats/translation_global_{YYYY-MM}   → { totalCharactersTranslated }

TTS:
  usage/chirpTts/users/{uid}/months/{YYYY-MM} → { charsUsed }
  usage/chirpTts/global/{YYYY-MM}             → { charsUsed }

STT:
  usage/chipttStt/users/{uid}/months/{YYYY-MM} → { audioSecondsUsed }
  usage/chipttStt/global/{YYYY-MM}             → { audioSecondsUsed }

AI:
  users/{uid}/meta/main                        → { aiUsedToday, aiQuotaDaily, aiDateKey }
  usage/global                                 → { aiCalls, dateKey }

Cards:
  users/{uid}/meta/main                        → { cardCount, cardQuota, tier }
```

### Missing: Call Counts

Translation and TTS persist usage amounts but not the number of API calls. For the admin dashboard we want both chars/calls. STT and AI already have call-level tracking.

---

## Changes

### Part A: Backend — Add `callCount` to Translation

**File:** `backend/src/functions/src/services/translationQuota.js`

In `persistTranslationQuotaUsage()`, add `callCount` / `totalCalls`:

```javascript
// Global doc
totalCharactersTranslated: ... + incomingChars,
totalCalls: (globalData.totalCalls || 0) + 1,

// User doc
charactersTranslated: ... + incomingChars,
callCount: (userData.callCount || 0) + 1,
```

In `fetchTranslationQuotaDocuments()`, add defaults:

```javascript
global: { currentMonth: monthKey, totalCharactersTranslated: 0, totalCalls: 0 }
user: { userId: uid, currentMonth: monthKey, charactersTranslated: 0, callCount: 0 }
```

### Part B: Backend — Add `callCount` to TTS

**File:** `backend/src/functions/src/services/chirpTtsService/quota.js`

Same pattern: add `callCount` to user doc and `totalCalls` to global doc in the persist function.

### Part C: Backend — New Cloud Function `getAdminUsage`

**File:** `backend/src/functions/src/routes/userRoutes.js`

New exported function `getAdminUsage`:

```javascript
exports.getAdminUsage = onRequest({ cors: true }, async (req, res) => {
  // 1. Auth check (requireAuth)
  // 2. Admin check: hardcoded email === "rjara001@gmail.com" || "peptio@gmail.com"
  // 3. Receive { month?: string } — default current month
  // 4. Query all 4 services in parallel:
  //
  //    Translation:
  //      - Global: db.doc("usage_stats/translation_global_{month}")
  //      - Users: db.collectionGroup("usage").where("currentMonth", "==", month).where("userId", "!=", null).get()
  //
  //    TTS:
  //      - Global: db.doc("usage/chirpTts/global/{month}")
  //      - Users: db.collection("usage/chirpTts/users"). ... query subcollection
  //
  //    STT:
  //      - Global: db.doc("usage/chipttStt/global/{month}")
  //      - Users: similar pattern
  //
  //    AI (daily — show today):
  //      - Global: db.doc("usage/global")
  //      - Users: read meta for each user (aiUsedToday)
  //
  // 5. For each user doc, resolve email via getAuth().getUser(uid)
  //    (batch getUserInfo for efficiency: getAuth().getUser(uid) is one call per user)
  //
  // 6. Return unified report:
  {
    month: string,
    translation: {
      global: { used: number, calls: number, limit: 400000 },
      users: [{ email, uid, used, calls, limit, tier }]
    },
    tts: {
      global: { used: number, calls: number, limit: 500000 },
      users: [{ email, uid, used, calls, limit, tier }]
    },
    stt: {
      global: { used: number, calls: number, limit: 30000 },
      users: [{ email, uid, used, calls, limit, tier }]
    },
    ai: {
      global: { used: number, limit: 200 },
      users: [{ email, uid, used, limit, tier }]
    }
  }
});
```

**Query strategy per service:**

| Service | Global Doc | User Docs Query |
|---------|-----------|-----------------|
| Translation | `usage_stats/translation_global_{month}` | `collectionGroup("usage").where("currentMonth", "==", month).where("userId", "!=", null)` |
| TTS | `usage/chirpTts/global/{month}` | `collection("usage/chirpTts/users").where("monthKey", "==", month)` — collectionGroup won't work here because the path is `usage/chirpTts/users/{uid}/months/{month}` |
| STT | `usage/chipttStt/global/{month}` | Same pattern as TTS |
| AI | `usage/global` | Read from `users/{uid}/meta/main` for each user (already have tier + aiUsedToday) |

**Note on TTS/STT user queries:** The nested subcollection `usage/chirpTts/users/{uid}/months/{month}` doesn't support `collectionGroup` well. Alternative: iterate `users/{}` collection and read `usage/chirpTts/users/{uid}/months/{month}` for each. For <50 users this is fine.

### Part D: Frontend — New `AppView` and Routing

**File:** `src/types/app.ts`

```typescript
export type AppView = 'dashboard' | 'game' | 'editor' | 'activity' | 'reports' | 'settings' | 'admin';
```

**File:** `src/App.tsx`

Add routing:
```tsx
{view === 'admin' && <AdminUsageView onBack={() => setView('dashboard')} />}
```

### Part E: Frontend — Admin Access Control

**File:** `src/components/layout/AppHeader.tsx`

Show "Admin" button only for admin users:

```tsx
const ADMIN_EMAILS = ['rjara001@gmail.com', 'peptio@gmail.com'];
const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

{isAdmin && (
  <button onClick={() => onNavigate('admin')} className={...}>
    Admin
  </button>
)}
```

### Part F: Frontend — `adminService.ts`

**File:** `src/services/adminService.ts` (new file)

```typescript
import { callFunction } from './callFunction';
import { auth } from '../firebase';

export interface ServiceUsage {
  used: number;
  calls: number;
  limit: number;
}

export interface UserUsage {
  email: string;
  uid: string;
  used: number;
  calls: number;
  limit: number;
  tier: string;
}

export interface AdminUsageReport {
  month: string;
  translation: { global: ServiceUsage; users: UserUsage[] };
  tts: { global: ServiceUsage; users: UserUsage[] };
  stt: { global: ServiceUsage; users: UserUsage[] };
  ai: { global: ServiceUsage; users: UserUsage[] };
}

export const adminService = {
  async getUsage(month?: string): Promise<AdminUsageReport> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');
    return callFunction('getAdminUsage', { userId, month });
  },
};
```

### Part G: Frontend — `AdminUsageView.tsx`

**File:** `src/components/views/AdminUsageView.tsx` (new file)

Layout:

```
┌──────────────────────────────────────────────┐
│ ← Back    Admin Usage Dashboard              │
│                                               │
│ Month: [August 2026 ▼]                        │
│                                               │
│ ┌── Global Usage ────────────────────────────┐│
│ │ Translation: ██████░░░░  12,400 / 400,000 ││
│ │ TTS:         ██░░░░░░░░   3,200 / 500,000 ││
│ │ STT:         ████████░░  24,000 /  30,000 ││
│ │ AI:          ████░░░░░░     85 /     200   ││
│ └────────────────────────────────────────────┘│
│                                               │
│ ┌── Per-User Usage ──────────────────────────┐│
│ │ ┌─────────────────────────────────────────┐││
│ │ │ peptio@gmail.com (premium)              │││
│ │ │ Translation: 8,400 chars  (3 calls)     │││
│ │ │ TTS:         2,100 chars  (5 calls)     │││
│ │ │ STT:        18,000 secs   (2 calls)     │││
│ │ │ AI:              5 calls                 │││
│ │ └─────────────────────────────────────────┘││
│ │ ┌─────────────────────────────────────────┐││
│ │ │ user2@gmail.com (free)                  │││
│ │ │ Translation: 4,000 chars  (1 call)      │││
│ │ │ TTS:         1,100 chars  (2 calls)     │││
│ │ │ STT:         6,000 secs   (1 call)      │││
│ │ │ AI:              3 calls                 │││
│ │ └─────────────────────────────────────────┘││
│ └────────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Component structure:**

```tsx
const AdminUsageView: React.FC<AdminUsageViewProps> = ({ onBack }) => {
  const [month, setMonth] = useState(currentMonthKey);
  const [report, setReport] = useState<AdminUsageReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch on mount and month change
  useEffect(() => { ... }, [month]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back button + title */}
      {/* Month selector */}
      {/* Global usage cards (4 service bars) */}
      {/* Per-user accordion/cards */}
    </div>
  );
};
```

**UI pattern:** Follow existing `ReportsView` style — `max-w-*xl mx-auto p-6`, back button, cards with `bg-white rounded-[2rem] shadow-sm border`.

---

## File Summary

| # | File | Action | Change |
|---|------|--------|--------|
| 1 | `backend/src/functions/src/services/translationQuota.js` | Modify | Add `callCount`/`totalCalls` to persist + defaults |
| 2 | `backend/src/functions/src/services/chirpTtsService/quota.js` | Modify | Add `callCount`/`totalCalls` to persist + defaults |
| 3 | `backend/src/functions/src/routes/userRoutes.js` | Modify | New `getAdminUsage` Cloud Function |
| 4 | `backend/src/functions/index.js` | No-op | `loadRoutes(userRoutes)` already exists |
| 5 | `src/types/app.ts` | Modify | Add `'admin'` to `AppView` |
| 6 | `src/services/adminService.ts` | Create | Frontend service for `getAdminUsage` |
| 7 | `src/components/views/AdminUsageView.tsx` | Create | Admin dashboard view |
| 8 | `src/components/layout/AppHeader.tsx` | Modify | Conditional "Admin" button |
| 9 | `src/App.tsx` | Modify | Route admin view |

---

## Verification

1. Backend: call `getAdminUsage` via emulator, verify all 4 services return data
2. Frontend: login as `rjara001@gmail.com`, verify "Admin" button visible
3. Navigate to admin view, verify global bars and per-user cards render
4. Change month selector, verify data updates
5. Non-admin user: verify "Admin" button hidden
6. Build: `npm run build` passes
