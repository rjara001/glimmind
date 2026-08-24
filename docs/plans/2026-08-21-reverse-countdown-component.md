# Reverse Countdown Component — Requirement

**Date:** 2026-08-21
**Status:** Draft
**Scope:** New reusable UI component + first integration in game flow

## Goal

Add a reusable reverse countdown component (5.. 4.. 3.. 2.. 1..) that renders a
subtle visual indicator and fires an event when the countdown finishes. It must
be a standalone component, decoupled from any game or business logic, so it can
be attached to different actions across the app.

## Component Requirements

- **Standalone and decoupled.** No imports of game state, stores, services, or
  voice hooks. Communication happens exclusively through props.
- **Configurable duration** in seconds (e.g. 5 → displays 5, 4, 3, 2, 1).
- **Controlled activation.** The parent decides when it starts/stops via a prop
  (e.g. `isRunning`). Resetting to idle restores the initial value.
- **Completion event.** When the countdown reaches zero it invokes an
  `onComplete` callback exactly once. The component does NOT decide what happens
  next; the parent owns that behavior.
- **Subtle visual.** Small, non-intrusive indicator rendered in a corner of its
  container (e.g. a small circular badge showing the remaining number). Exact
  placement must be configurable through a class/style prop so the host view
  controls positioning.
- **Accessibility.** Announced politely (`role="status"`, `aria-live="polite"`)
  without stealing focus.
- **Cleanup.** Timers must be cleared on stop/unmount to avoid leaks or stray
  callbacks.
- **No magic numbers.** Durations and tick interval come from props/constants.

## First Integration — Auto "Next" After Reveal

The first use case is the reveal action:

1. The card's hidden value is revealed (shown visually or spoken by TTS).
2. The countdown starts immediately after the reveal.
3. When the countdown completes, the parent triggers the equivalent of the
   **"next" command automatically** (same path as the voice command "siguiente":
   advance the card, including its existing feedback such as toast/spoken ack).

Constraints for this integration:

- Only one countdown runs at a time; revealing again or advancing manually
  cancels/restarts it cleanly.
- If the session ends (game finished or the user navigates back), the countdown
  is cancelled and no auto-advance fires.
- The auto-advance must not double-fire if the user already advanced manually
  during the countdown.
- In voice mode the completion triggers the full "next" command (toast +
  spoken acknowledgement); outside voice mode it advances silently.

## Out of Scope

- Any other placement/use case beyond the reveal integration (future work).
- Persisting countdown preferences or exposing them in settings.
