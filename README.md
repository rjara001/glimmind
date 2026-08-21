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

### Folder Organization

The codebase is organized by **domain** rather than by file type. This keeps related code close and makes it easier to navigate as the project grows.

```
src/
├── services/
│   ├── gameEngine.ts          # Immutable game engine
│   ├── aiService.ts           # Gemini AI proxy
│   ├── firestoreService.ts    # Firebase Functions HTTP client
│   ├── voice/
│   │   ├── chipttStt.ts       # Chip STT API client
│   │   ├── chirpVoices.ts     # Chirp voice catalog
│   │   ├── commands.ts        # Voice command matching
│   │   ├── earlyMatch.ts      # Early STT answer matching
│   │   ├── languageFlags.ts   # Language flag emojis
│   │   ├── languages.ts       # Voice language resolution
│   │   └── voicePicker.ts     # Browser voice selection
│   ├── grouping/              # Semantic grouping engine
│   └── ...
├── components/
│   ├── views/                 # Top-level screens
│   │   ├── GameView.tsx
│   │   ├── Dashboard.tsx
│   │   ├── HistoryView.tsx
│   │   ├── RankingView.tsx
│   │   ├── ReportsView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── GameSummaryView.tsx
│   │   └── Auth.tsx
│   ├── game/                  # Game-specific presentational components
│   │   ├── GameCard.tsx       # Card orchestrator
│   │   ├── CardBadges.tsx     # Overlay badges
│   │   ├── CardToolbar.tsx    # Edit / listen buttons
│   │   ├── CardContent.tsx    # Term, input, hints
│   │   ├── CardFeedback.tsx   # Correct/incorrect feedback
│   │   ├── CardVoiceIndicator.tsx
│   │   ├── CardEditForm.tsx
│   │   ├── GameHeader.tsx
│   │   ├── GameControls.tsx
│   │   ├── CycleProgress.tsx
│   │   ├── FinishedScreen.tsx
│   │   └── AttemptList.tsx
│   ├── modals/                # Modal dialogs
│   │   ├── QuickAddModal.tsx
│   │   ├── SmartGroupModal.tsx
│   │   └── SettingsModal.tsx
│   ├── layout/                # Shared layout primitives
│   │   ├── Toast.tsx
│   │   ├── GameHeader.tsx
│   │   ├── GoalWidget.tsx
│   │   └── CelebrationOverlay.tsx
│   ├── cards/                 # Reusable card layouts
│   │   └── BigListCard.tsx
│   └── voice/                 # Voice study mode screens
│       ├── VoiceGameView.tsx
│       ├── VoiceCard.tsx
│       └── VoiceFinished.tsx
├── hooks/
│   ├── voice/                 # Voice domain hooks
│   │   ├── useVoiceSession.ts # Standalone voice session
│   │   ├── useGameVoice.ts    # Integrated game voice
│   │   ├── useVoiceGameRefs.ts
│   │   ├── useVoiceSTT.ts
│   │   ├── useSpeechSynthesis.ts
│   │   ├── useSpeechRecognition.ts
│   │   ├── useSTT.ts
│   │   ├── useChirpTTS.ts
│   │   ├── useChirpVoices.ts
│   │   ├── useAudioRecorder.ts
│   │   └── stt/
│   │       ├── useBrowserSTT.ts
│   │       ├── useVoskSTT.ts
│   │       └── useChipTTSTT.ts
│   ├── game/                  # Game logic hooks
│   │   ├── useGameLogic.ts
│   │   └── useGameEngine.ts
│   └── ui/                    # UI utility hooks
│       ├── useImmersiveHeader.ts
│       ├── useMediaQuery.ts
│       └── useFitWidth.ts
├── store/
│   └── gameStore.ts           # Zustand global state
├── types/
│   └── ...                    # TypeScript interfaces
├── constants/
│   └── voice.ts               # Voice timing constants
├── utils/
│   └── ...                    # Pure utility functions
├── docs/                      # Design docs and plans
└── App.tsx                    # Root component
```

### Domain Boundaries

- **`components/views/`** — route-level screens. They compose layout, game, and modal components but contain minimal business logic.
- **`components/game/`** — presentational components for the flashcard game. Each component owns a single visual concern (content, feedback, toolbar, badges, voice indicator).
- **`hooks/voice/`** — all voice-related hooks. `useVoiceSession` is the standalone voice-study flow; `useGameVoice` is the integrated in-game voice mode.
- **`hooks/game/`** — bridges between React and the immutable engine.
- **`services/voice/`** — pure service layer for TTS/STT providers, command matching, and language resolution. No React dependencies.

### Voice Architecture

The voice layer has two consumer-facing modes:

| Mode | Hook | Consumer |
|------|------|----------|
| **Integrated** | `useGameVoice` | `GameView` + `GameCard` |
| **Standalone session** | `useVoiceSession` | `VoiceGameView` |

Both modes share:
- `useSpeechSynthesis` — browser + Chirp TTS provider
- `useSpeechRecognition` → `useSTT` → `useBrowserSTT` / `useChipTTSTT` — STT provider selection
- `constants/voice.ts` — shared timing constants

This separation allows the voice stack to evolve independently from the game logic while keeping the public API stable for each consumer.

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
