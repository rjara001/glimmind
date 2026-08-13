<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Glimmind — Word Association Master

Glimmind is a cross-platform flashcard application for language learning, built with a focus on clean architecture, testability, and an engaging spaced-repetition experience. It runs on the web, iOS, and Android.

> "Flashcards on steroids for your brain."

## Features

- **4-Cycle Spaced Repetition**: Cards progress through New → Seen → Recognized → Known → Learned based on your performance.
- **Two Game Modes**:
  - **Exam mode (`real`)**: Type your answer; validated via fuzzy matching with configurable similarity threshold.
  - **Training mode (`training`)**: Self-evaluate by revealing the answer and marking it correct or passing.
- **Fuzzy Answer Validation**: Accent-insensitive Levenshtein distance algorithm for forgiving matching — essential for Spanish vocabulary.
- **AI-Powered Smart Grouping**: Uses Google Gemini to analyze associations and suggest logical category groupings.
- **Local-First with Cloud Sync**: All data persisted in localStorage; optional Firebase Firestore sync for authenticated users.
- **Cross-Platform**: Web (Vite + PWA), iOS, and Android (Capacitor 8).
- **Google OAuth**: Authentication with guest mode fallback.
- **Keyboard Shortcuts**: Full keyboard navigation for efficient studying.

## Architecture

### Immutable Game Engine

The core of Glimmind is an **immutable state machine** implemented in `services/gameEngine.ts`. Every operation — `reveal()`, `checkAnswer()`, `processAction()`, `restart()` — returns a **new instance** of the game rather than mutating existing state:

```
game.reveal()        → new GlimmindGame(revealedState)
game.checkAnswer()   → new GlimmindGame(correct|incorrect state)
game.processAction() → new GlimmindGame(next cycle state)
```

This design:
- Eliminates stale-closure bugs common in interactive UIs
- Makes every state transition deterministic and testable
- Works seamlessly with React's `useState` and Zustand

### Fuzzy Answer Validation

The validation pipeline works in three stages:

1. **Normalization**: Input is lowercased and decomposed via Unicode NFD, stripping combining diacritical marks (`\u0300-\u036f`). "canción" matches "cancion".
2. **Levenshtein Distance**: A dynamic programming matrix computes the minimum edit distance between normalized strings.
3. **Similarity Score**: `(1 - distance / maxLength) × 100`. A configurable threshold (default 95%) determines correctness.

### 4-Cycle Progression

| Cycle | Label | Meaning |
|-------|-------|---------|
| 1 | Nueva (New) | First exposure |
| 2 | Vista (Seen) | Previously seen, needs review |
| 3 | Reconocida (Recognized) | Familiar but not automatic |
| 4 | Conocida (Known) | Nearly mastered |
| — | Learned | Mastered (exits rotation) |

- **Correct answer**: Advances or marks as learned (cycle 1 only).
- **Incorrect / PASS**: Moves to the next cycle for future review.
- **Cycle exhaustion**: When the current queue is fully processed, the engine generates a new queue for the next cycle. If no cards remain for any cycle, the session ends.

### Project Structure

```
src/
├── services/
│   ├── gameEngine.ts          # Immutable game engine (344 lines)
│   ├── aiService.ts           # Gemini AI proxy (Cloud Functions call)
│   ├── firestoreService.ts    # Firebase Functions HTTP client
│   └── gameEngine.test.ts     # Engine tests (440+ lines)
├── components/
│   ├── Dashboard.tsx          # List overview, stats, search
│   ├── GameView.tsx           # Game screen orchestrator
│   ├── ListEditor.tsx         # CRUD for study lists + AI grouping
│   └── game/
│       ├── GameCard.tsx       # Card display with hidden/revealed state
│       ├── GameControls.tsx   # Action buttons
│       ├── CycleProgress.tsx  # Cycle distribution visualization
│       └── FinishedScreen.tsx # End-of-session summary
├── store/
│   └── gameStore.ts           # Zustand global state
├── hooks/
│   └── useGameLogic.ts        # Bridge between UI and game engine
├── types/
│   └── ...                    # TypeScript interfaces
└── App.tsx                    # Root component with routing
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| State | Zustand |
| Mobile | Capacitor 8 (iOS + Android) |
| Backend | Firebase (Firestore, Auth, Functions, Hosting) |
| AI | Google Gemini API |
| Testing | Vitest, React Testing Library |
| PWA | vite-plugin-pwa |

## Run Locally

**Prerequisites:** Node.js, a Firebase project with the functions deployed (see [Deployment](#deployment)).

1. Install dependencies:
   ```
   npm install
   ```
2. Set your Firebase web app config in `.env.local` (used by `firebase.ts`):
   ```
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FUNCTIONS_BASE=https://us-central1-<project>.cloudfunctions.net
   ```
   > The Gemini API key is **never** stored in the client. It lives as a server-side secret and is only used by the Cloud Functions proxy (see below).
3. Start the dev server:
   ```
   npm run dev
   ```

## Quotas

Glimmind enforces server-side quotas to keep the Firebase free tier viable for ~1,000 users.

| Quota | Free | Premium |
|-------|------|---------|
| Cards (active + archived) | 1,000 | 5,000 |
| AI groupings per day | 3 | 10 |

Additional limits:
- **Global AI cap**: 200 AI calls per day across the whole project.
- **Max cards per list**: 3,000 (request payload limit).
- **Warnings**: the UI shows an amber banner at 90% usage and blocks new additions with a message at 100%.

Quotas are enforced in `functions/index.js` via a `users/{uid}/meta/main` document (tier, card count, quota, AI usage) and a `usage/global` document for the project-wide AI cap. Premium is assigned with the protected `setUserQuota` function.

## Deployment

1. Set the Gemini API key secret (server-side, never exposed to the client):
   ```
   firebase functions:secrets:set GEMINI_API_KEY --project <project>
   ```
2. Set the admin UID secret (comma-separated list of UIDs allowed to call `setUserQuota`):
   ```
   firebase functions:secrets:set ADMIN_UIDS --project <project>
   ```
3. Build the app and deploy functions + hosting:
   ```
   firebase deploy --only functions,hosting --project <project>
   ```
4. To promote a user to premium:
   ```
   curl -X POST https://us-central1-<project>.cloudfunctions.net/setUserQuota \
     -H "Authorization: Bearer <idToken>" \
     -H "Content-Type: application/json" \
     -d '{"uid":"<target-user-uid>","tier":"premium"}'
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Run Vitest test suite |
| `npm run deploy` | Build + deploy to Firebase |
| `npm run ios:build` | Sync Capacitor iOS |
| `npm run android:build` | Sync Capacitor Android |

## Testing

The engine has **440+ lines of tests** covering:

- All game state transitions (CORRECT, PASS, restart, empty lists)
- Threshold validation with exact edge cases
- 30+ real vocabulary test cases (phrasal verbs, Spanish/English pairs)
- Full multi-cycle progression scenarios

```
npm run test
```

## Technical Documentation

See [`glimmind-engine.md`](./glimmind-engine.md) for detailed technical specifications including keyboard shortcuts, validation logic, and cycle progression examples.
