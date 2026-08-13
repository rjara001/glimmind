# Glimmind Game Engine — Technical Specification

This document describes the keyboard shortcuts and gameplay logic available in the Glimmind game view to streamline studying.

## Exam Mode (`real`)

### Button Layout

- **Pass** / **Next** button
- **Validate** button
- **Reveal** button

- **Pass**: Advances to the next card.
- **Validate**: Checks the submitted answer.
- **Reveal**: Displays the correct answer and disables the **Validate** button.

### Attempt Validation

When a user submits an attempt, the validation logic works as follows:

### Incorrect Attempt

A toast message appears for a fixed duration.

- The toast displays:
  - The text entered by the user.
  - The similarity percentage.
  - The required similarity threshold (`threshold`).
- The answer input field is cleared automatically.
- Focus returns to the input field.
- The card border briefly turns red, signaling the answer was incorrect.
- Additionally:
  - All previous attempts are displayed below, stacked in order.
  - Each attempt shows:
    - The text entered by the user.
    - The similarity percentage.
    - The required similarity threshold (`threshold`).

### Correct Attempt

- A brief message appears showing:
  - The expected answer.
  - The text entered by the user.
  - The similarity percentage.
  - The required similarity threshold (`threshold`).
- The game advances to the next card.
- The answer input field is cleared automatically.
- Focus returns to the input field.
- The card border briefly turns green, signaling the answer was correct.

### Typing the Answer (card not revealed)

- **`Enter`**: Validates the typed answer.
- **`Tab`**: Moves focus from the input field to the **Validate** button.

## Training Mode (`training`)

### Button Layout

- **Pass** / **Next** button
- **Reveal** button
- **Correct** button

- **Pass**: Advances to the next card.
- **Reveal**: Displays the answer.
- **Correct**: Marks the card as correctly answered.

### Behavior

- When a new card is presented, it shows the association.
- The displayed value is the **front** of the card (unless flipped).
- The **back** of the card is hidden by default (shown as asterisks `*`).
- Pressing **Reveal** shows the back of the card.
- Pressing **Correct** marks the card as correctly answered.
- Pressing **Pass** advances to the next card; the back returns to hidden state (reset).
- When the session starts, the first card also has its back hidden.
- No feedback messages are shown in this mode.

### Tab Sequence (Training Mode)

- After tab, focus moves to the **Correct** button.
- After tab, focus moves to the **Reveal** button.
- After tab, focus moves to the **Pass** button.

---

## Change Management

- Every change must include a version bump.

## Data Persistence

- Game state must be persisted in localStorage.
- A sync button must exist to pull cloud data into localStorage.
- Before leaving the application, data must be saved to the cloud without asking the user.

## Data Synchronization

### Tab Sequence (Exam Mode)

- When an association is presented, focus starts in the answer input field.
- After tab, focus moves to the **Validate** button.
- After tab, focus moves to the **Reveal** button.
- After tab, focus moves to the **Pass** button.
- After tab, focus returns to the answer input field.

---

## Session Termination and Cycle Progression Logic (Exam Mode)

This section details how the engine determines when a session ends and how cards progress through cycles.

Consider a list of 10 cards as an example.

### Case 1: All Answers Correct on the First Pass

- **First card is presented:**
  - Remaining: 10, Correct: 0
  - Cycle 1 (New): 10
- The user types an answer, validates it, and it is correct.
- **Next card is presented:**
  - Remaining: 9, Correct: 1
  - Cycle 1 (New): 10
- The user types an answer, validates it, and it is correct.
- **Next card is presented:**
  - Remaining: 8, Correct: 2
  - Cycle 1 (New): 10
- ... this continues until all cards have been checked.
- **Last card is presented:**
  - Remaining: 0, Correct: 10
  - Cycle 1 (New): 10
- **Result:** Since "Remaining" reaches 0 and there are no cards queued for the next cycle, **the session ends**.

### Case 2: Mixed Correct and Incorrect Answers

- **First card is presented:**
  - Remaining: 10, Correct: 0
  - Cycle 1 (New): 10
- The user types an answer, validates it, and it is correct.
- **Next card is presented:**
  - Remaining: 9, Correct: 1
  - Cycle 1 (New): 10
- The user types an answer, validates it, and it is correct.
- **Next card is presented:**
  - Remaining: 8, Correct: 2
  - Cycle 1 (New): 10
- ... this continues (e.g., 5 consecutive correct answers):
  - Remaining: 5, Correct: 5
  - Cycle 1 (New): 10
- ... this continues (e.g., failing the next 5):
  - Remaining: 0, Correct: 5
  - Cycle 1 (New): 5 (The 5 that were answered correctly)
  - Cycle 2 (Seen): 5 (The 5 that were answered incorrectly)
- **Result:** Although "Remaining" is 0, there are 5 cards that advanced to the next cycle (Cycle 2 — Seen). Therefore, the game advances to Cycle 2.

- **Cycle 2 starts. The first card from the new cycle is presented:**
  - Remaining: 5, Correct: 0
  - Cycle 1 (New): 5 (The correct answers from Cycle 1)
  - Cycle 2 (Seen): 5 (The incorrect answers from the previous cycle, now up for review)
- ... this continues (e.g., all 5 answered correctly in a row).
- **Last card of Cycle 2 is presented:**
  - Remaining: 0, Correct: 5
  - Cycle 1 (New): 5 (The 5 answered correctly in Cycle 1)
  - Cycle 2 (Seen): 5 (The 5 answered correctly in Cycle 2)
- **Result:** "Remaining" is 0 and **no cards are left** to advance to a subsequent cycle. **The session ends**.

This pattern repeats depending on how many errors the user makes, generating progressive cycles until all cards are cleared and no future queue remains.
