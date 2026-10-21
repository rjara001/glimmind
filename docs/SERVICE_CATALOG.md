# Service Catalog

Every action a user can perform in Glimmind, grouped by area, with the variable cost it
imposes on us.

**Purpose:** decide which features can stay free and which require Premium. Under Rule 0
(see `docs/BUSINESS_MODEL.md`), a Free user must never trigger a feature that costs us
money per use.

**Scope:** this document lists *what the user can do*. It does not document *how* it is
implemented, and it does not decide the final limits. Limits are decided after this
catalog is reviewed.

**Status markers used below:**

| Marker          | Meaning                                                        |
| --------------- | -------------------------------------------------------------- |
| `NOT IMPLEMENTED` | The app promises it, but there is no way to do it today.     |
| `NOT WORKING`     | The action exists but does not behave as the app describes.  |

---

## 1. Creating and Loading Decks

| Functionality    | Sub-functionality              | Description                                                    | Has cost        |
| ---------------- | ------------------------------ | -------------------------------------------------------------- | --------------- |
| Create deck      | Deck from a YouTube video      | Paste a link and the app builds the cards automatically        | Yes (Gemini)    |
| Create deck      | Deck from free text            | Write a text and the app builds the cards automatically        | Removed 2026-10-12 — see `docs/removed-features.md` |
| Create deck      | Deck from a pasted list        | Paste words and definitions separated by commas                | No              |
| Create deck      | Deck from a CSV file           | Upload a file containing your words                             | No              |
| Create deck      | Deck from the site catalog     | Pick a ready-made deck and download it                          | No              |
| Create deck      | Empty list                     | Start a list by hand and fill it yourself                       | No              |
| Create deck      | Extract keywords               | The app detects the important words in a text on its own        | No              |
| Create deck      | Split an oversized deck        | If a deck is too long, the app splits it into several           | No              |
| Create deck      | Review before confirming       | See the cards before saving them                                | No              |
| Create deck      | Translate to another language  | Translates all the definitions                                  | Yes (Google Translate) |

## 2. Studying

| Functionality    | Sub-functionality              | Description                                                    | Has cost        |
| ---------------- | ------------------------------ | -------------------------------------------------------------- | --------------- |
| Study            | Practice mode                  | You see the answer and rate yourself                           | No              |
| Study            | Real mode                      | The app grades you without self-rating                         | No              |
| Study            | Flip the card                  | Show the word instead of the definition, or the reverse         | No              |
| Study            | Reveal the card                | Reveal the answer                                               | No              |
| Study            | Skip a word                    | Flag it to come back later                                      | No              |
| Study            | Mark as known                  | Mark it as learned                                              | No              |
| Study            | Write the definition           | Type it yourself and the app corrects you                      | No              |
| Study            | Say it out loud                | Speak the word and the app tells you if you were right          | Yes (only with a premium voice) |
| Study            | Listen with the normal voice   | The phone browser reads it aloud                                | No              |
| Study            | Listen with the improved voice | Premium, much more natural voice                                | Yes (Google TTS) |
| Study            | Recognise voice offline        | The app listens without using mobile data                       | No (but downloads 41 MB) |
| Study            | Hints                          | The app helps you when you get stuck                            | No              |
| Study            | Auto-advance                   | Cards move on their own                                         | No              |
| Study            | See the "why X%?" explanation  | It explains why you missed                                      | No              |
| Study            | Continue where I left off      | Resume an unfinished session                                    | No              |
| Study            | Review cycles                  | Repeat each word 1 to 4 times                                   | No              |
| Study            | Archive what I know            | Remove from study what you have already learned                 | No              |

## 3. Viewing and Editing a Deck

| Functionality    | Sub-functionality              | Description                                                    | Has cost        |
| ---------------- | ------------------------------ | -------------------------------------------------------------- | --------------- |
| Edit deck        | Edit a word                    | Change a definition                                            | No              |
| Edit deck        | Delete a word                  | Remove it from the deck                                        | No              |
| Edit deck        | Edit from within the game      | Fix something without leaving the session                       | No              |
| Edit deck        | Add words                      | Insert new words                                               | No              |
| Edit deck        | Record audio for a word        | Record it and keep it in my own voice                           | Yes (only with premium transcription) |
| Edit deck        | Publish my deck to the catalog | Share it with other users                                      | No — `NOT IMPLEMENTED` |

## 4. Exporting and Data

| Functionality    | Sub-functionality              | Description                                                    | Has cost        |
| ---------------- | ------------------------------ | -------------------------------------------------------------- | --------------- |
| Export           | Download as CSV                | Take my words away in a file                                   | No              |
| Export           | Download everything            | Take all the information in my account away                    | No — `NOT IMPLEMENTED` |
| Export           | Delete my account              | Close the account and erase everything                         | No — `NOT IMPLEMENTED` |

## 5. My Progress

| Functionality    | Sub-functionality              | Description                                                    | Has cost        |
| ---------------- | ------------------------------ | -------------------------------------------------------------- | --------------- |
| My progress      | See streak and daily goal      | How many days in a row I have kept it up                       | No              |
| My progress      | See deck progress              | How many of how many words I already know                      | No              |
| My progress      | See cycle progress             | How the current cycle is going                                 | No              |
| My progress      | See history                    | My past sessions                                               | No              |
| My progress      | See reports                    | Detailed statistics                                            | No (hidden behind a disabled flag) |
| My progress      | Reset progress                 | Start the deck over from zero                                  | No              |

## 6. Account and Plan

| Functionality    | Sub-functionality              | Description                                                    | Has cost        |
| ---------------- | ------------------------------ | -------------------------------------------------------------- | --------------- |
| My account       | Create account / sign in       | I register or log in                                          | No              |
| My account       | Continue without registering   | I use the app as a guest                                       | No              |
| My account       | See how much I have used       | How much of my monthly allowance I have consumed              | No              |
| My account       | Buy Premium                    | I pay 4.99 EUR once                                            | Revenue, not a cost |
| My account       | Use another device             | I see my progress on my phone and on my computer               | No — `NOT WORKING` |

---

## 7. Gaps Between Promise and Reality

These are the items the app or its legal pages describe but that a user cannot do today.

### 7.1 Promised but not implemented

| Promised                             | Where it is promised         | Reality                                            |
| ------------------------------------ | ---------------------------- | -------------------------------------------------- |
| Download all my data                 | Privacy Policy               | `NOT IMPLEMENTED` — no button exists              |
| Delete my account                    | Terms of Service             | `NOT IMPLEMENTED` — no button exists              |
| Recordings deleted after 30 days     | Privacy Policy               | `NOT IMPLEMENTED` — no cleanup job exists          |
| Exam mode                            | Landing page                 | `NOT IMPLEMENTED` — only Practice and Real exist   |
| Spaced repetition                    | Former marketing copy         | `WITHDRAWN` — removed from all copy on 2026-10-21. The product ships a visible 4-cycle progression (New → Seen → Recognized → Frequent → Learned) with no review intervals or due dates, and must never be marketed as spaced repetition |
| Publish a deck to the catalog        | Backend capability          | `NOT IMPLEMENTED` — no screen exists              |
| Deck from free text (Gemini)         | Onboarding card             | `REMOVED` — deleted on 2026-10-12. Extract keywords is covered by Nueva Lista → Importar → Extraer Keywords |

### 7.2 Not working as described

| Feature                | What the app says                    | Reality                                                                 |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| Use another device     | Progress follows me                  | `NOT WORKING` — progress is never uploaded; it lives only in the browser |
| Premium faster sync    | Premium syncs twice as fast          | `NOT WORKING` — the periodic sync is never started, for either tier     |
| Priority progress sync| Premium keeps progress safer        | `NOT WORKING` — the progress service has no callers                    |

### 7.3 What never leaves the device

Progress is stored locally in the browser. If the user clears browser data, changes device,
or uses a private window, the following are lost with no server-side copy:

- Streak and daily goal
- Progress of each individual word
- Deck settings and study preferences
- Recorded activity history
- Saved sessions